use argon2::{
    Argon2,
    password_hash::{PasswordHasher, PasswordVerifier, phc::PasswordHash},
};
use axum::{
    Json, Router,
    extract::{ConnectInfo, Path, State},
    http::{
        HeaderMap, HeaderValue, StatusCode,
        header::{COOKIE, ORIGIN, SET_COOKIE, USER_AGENT},
    },
    response::{IntoResponse, Response},
    routing::{delete, get, post},
};
use chrono::{Duration as ChronoDuration, Utc};
use serde::Serialize;
use sha2::{Digest, Sha256};
use sqlx::{PgConnection, PgPool};
use std::net::SocketAddr;
use uuid::Uuid;

use crate::{
    AppState,
    error::ApiError,
    models::{
        Account, CardCreateInput, CardUpdateInput, LoginInput, RegisterInput, SessionSummary,
        WorldCreateInput,
    },
    store,
};

const SESSION_COOKIE: &str = "vvd_session";
const SESSION_SECONDS: i64 = 60 * 60 * 24 * 14;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

fn email_value(value: &str) -> Result<String, ApiError> {
    let email = value.trim().to_lowercase();
    if email.len() > 254
        || email.chars().any(char::is_whitespace)
        || email.matches('@').count() != 1
    {
        return Err(ApiError::bad_request("Enter a valid email address."));
    }

    let Some((local, domain)) = email.split_once('@') else {
        return Err(ApiError::bad_request("Enter a valid email address."));
    };

    if local.is_empty()
        || domain.len() < 3
        || !domain.contains('.')
        || domain.starts_with('.')
        || domain.ends_with('.')
    {
        return Err(ApiError::bad_request("Enter a valid email address."));
    }

    Ok(email)
}

fn validate_password(password: &str) -> Result<(), ApiError> {
    let length = password.chars().count();
    if !(12..=128).contains(&length) {
        return Err(ApiError::bad_request(
            "Passwords must contain between 12 and 128 characters.",
        ));
    }
    Ok(())
}

fn check_origin(headers: &HeaderMap, state: &AppState) -> Result<(), ApiError> {
    let Some(expected) = state.config.allowed_origin.as_deref() else {
        return Ok(());
    };
    let Some(origin) = headers.get(ORIGIN) else {
        return Ok(());
    };
    let origin = origin
        .to_str()
        .map_err(|_| ApiError::bad_request("Invalid request origin."))?;

    if origin.trim_end_matches('/') != expected.trim_end_matches('/') {
        return Err(ApiError::forbidden());
    }

    Ok(())
}

fn token_from_cookie(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .find_map(|part| {
            let (name, value) = part.trim().split_once('=')?;
            (name == SESSION_COOKIE && !value.is_empty()).then_some(value)
        })
}

fn token_hash(token: &str) -> Vec<u8> {
    Sha256::digest(token.as_bytes()).to_vec()
}

fn session_cookie(token: &str, state: &AppState) -> String {
    let secure = if state.config.secure_cookies {
        "; Secure"
    } else {
        ""
    };
    format!(
        "{SESSION_COOKIE}={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={SESSION_SECONDS}{secure}"
    )
}

fn expired_cookie(state: &AppState) -> String {
    let secure = if state.config.secure_cookies {
        "; Secure"
    } else {
        ""
    };
    format!(
        "{SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT{secure}"
    )
}

fn attach_cookie<T: IntoResponse>(response: T, cookie: String) -> Result<Response, ApiError> {
    let mut response = response.into_response();
    let header = HeaderValue::from_str(&cookie).map_err(|_| ApiError::internal())?;
    response.headers_mut().insert(SET_COOKIE, header);
    Ok(response)
}

async fn insert_session(
    connection: &mut PgConnection,
    account_id: Uuid,
    token: &str,
    user_agent: Option<&str>,
) -> Result<(), ApiError> {
    sqlx::query(
        "INSERT INTO sessions (id, account_id, token_hash, expires_at, user_agent)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(Uuid::new_v4())
    .bind(account_id)
    .bind(token_hash(token))
    .bind(Utc::now() + ChronoDuration::seconds(SESSION_SECONDS))
    .bind(user_agent.map(|value| value.chars().take(300).collect::<String>()))
    .execute(connection)
    .await?;

    Ok(())
}

async fn check_auth_rate_limit(
    pool: &PgPool,
    action: &str,
    email: &str,
    source_ip: &str,
    ip_limit: i32,
    email_limit: i32,
) -> Result<(), ApiError> {
    sqlx::query("DELETE FROM auth_rate_limits WHERE expires_at <= NOW()")
        .execute(pool)
        .await?;

    for (scope, value, limit) in [("ip", source_ip, ip_limit), ("email", email, email_limit)] {
        let digest = Sha256::digest(format!("{action}:{scope}:{value}").as_bytes()).to_vec();
        let attempts = sqlx::query_scalar::<_, i32>(
            "INSERT INTO auth_rate_limits
             (identifier_hash, attempts, window_started_at, expires_at)
             VALUES ($1, 1, NOW(), NOW() + INTERVAL '1 day')
             ON CONFLICT (identifier_hash) DO UPDATE
             SET attempts = CASE
                    WHEN auth_rate_limits.window_started_at <= NOW() - INTERVAL '15 minutes'
                    THEN 1 ELSE auth_rate_limits.attempts + 1
                 END,
                 window_started_at = CASE
                    WHEN auth_rate_limits.window_started_at <= NOW() - INTERVAL '15 minutes'
                    THEN NOW() ELSE auth_rate_limits.window_started_at
                 END,
                 expires_at = NOW() + INTERVAL '1 day'
             RETURNING attempts",
        )
        .bind(digest)
        .fetch_one(pool)
        .await?;

        if attempts > limit {
            return Err(ApiError::rate_limited());
        }
    }

    Ok(())
}

fn source_ip(ConnectInfo(address): ConnectInfo<SocketAddr>) -> String {
    address.ip().to_string()
}

fn user_agent(headers: &HeaderMap) -> Option<&str> {
    headers.get(USER_AGENT)?.to_str().ok()
}

async fn signed_in_account(pool: &PgPool, headers: &HeaderMap) -> Result<Account, ApiError> {
    let token = token_from_cookie(headers).ok_or_else(ApiError::unauthorized)?;
    if token.len() > 64 {
        return Err(ApiError::unauthorized());
    }

    let account = sqlx::query_as::<_, (Uuid, String, String)>(
        "SELECT a.id, a.email, a.display_name
         FROM sessions s
         INNER JOIN accounts a ON a.id = s.account_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW()",
    )
    .bind(token_hash(token))
    .fetch_optional(pool)
    .await?
    .ok_or_else(ApiError::unauthorized)?;

    Ok(Account {
        id: account.0,
        email: account.1,
        display_name: account.2,
    })
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/v1/auth/register", post(register))
        .route("/v1/auth/login", post(login))
        .route("/v1/auth/logout", post(logout))
        .route("/v1/auth/me", get(me))
        .route("/v1/auth/sessions", get(list_sessions))
        .route("/v1/auth/sessions/{session_id}", delete(revoke_session))
        .route("/v1/worlds", get(list_worlds).post(create_world))
        .route("/v1/worlds/{slug}", get(get_world))
        .route(
            "/v1/worlds/{slug}/documents",
            get(list_documents).post(create_card),
        )
        .route(
            "/v1/worlds/{slug}/documents/{document_id}",
            get(get_document).patch(update_card),
        )
        .with_state(state)
}

async fn health(State(state): State<AppState>) -> Result<Json<HealthResponse>, ApiError> {
    sqlx::query("SELECT 1").execute(&state.db).await?;
    Ok(Json(HealthResponse { status: "ok" }))
}

async fn register(
    State(state): State<AppState>,
    headers: HeaderMap,
    connect_info: ConnectInfo<SocketAddr>,
    Json(input): Json<RegisterInput>,
) -> Result<Response, ApiError> {
    check_origin(&headers, &state)?;
    let email = email_value(&input.email)?;
    check_auth_rate_limit(
        &state.db,
        "register",
        &email,
        &source_ip(connect_info),
        20,
        4,
    )
    .await?;
    let display_name = input.display_name.trim();
    if display_name.is_empty() || display_name.chars().count() > 60 {
        return Err(ApiError::bad_request(
            "Display names must contain between 1 and 60 characters.",
        ));
    }
    validate_password(&input.password)?;

    let password_hash = Argon2::default()
        .hash_password(input.password.as_bytes())
        .map_err(|_| ApiError::internal())?
        .to_string();

    let account_id = Uuid::new_v4();
    let token = Uuid::new_v4().to_string();
    let mut transaction = state.db.begin().await?;

    sqlx::query(
        "INSERT INTO accounts (id, email, display_name, password_hash)
         VALUES ($1, $2, $3, $4)",
    )
    .bind(account_id)
    .bind(&email)
    .bind(display_name)
    .bind(password_hash)
    .execute(&mut *transaction)
    .await?;

    insert_session(&mut transaction, account_id, &token, user_agent(&headers)).await?;
    transaction.commit().await?;

    let account = Account {
        id: account_id,
        email,
        display_name: display_name.to_owned(),
    };
    attach_cookie(
        (StatusCode::CREATED, Json(account)),
        session_cookie(&token, &state),
    )
}

async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    connect_info: ConnectInfo<SocketAddr>,
    Json(input): Json<LoginInput>,
) -> Result<Response, ApiError> {
    check_origin(&headers, &state)?;
    let email = email_value(&input.email)?;
    check_auth_rate_limit(&state.db, "login", &email, &source_ip(connect_info), 40, 10).await?;
    if input.password.is_empty() || input.password.chars().count() > 128 {
        return Err(ApiError::unauthorized());
    }

    let row = sqlx::query_as::<_, (Uuid, String, String, String)>(
        "SELECT id, email, display_name, password_hash
         FROM accounts WHERE LOWER(email) = $1",
    )
    .bind(&email)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(ApiError::unauthorized)?;

    let parsed_hash = PasswordHash::new(&row.3).map_err(|_| ApiError::internal())?;
    Argon2::default()
        .verify_password(input.password.as_bytes(), &parsed_hash)
        .map_err(|_| ApiError::unauthorized())?;

    let token = Uuid::new_v4().to_string();
    let mut connection = state.db.acquire().await?;
    insert_session(&mut connection, row.0, &token, user_agent(&headers)).await?;

    let account = Account {
        id: row.0,
        email: row.1,
        display_name: row.2,
    };
    attach_cookie(Json(account), session_cookie(&token, &state))
}

async fn logout(State(state): State<AppState>, headers: HeaderMap) -> Result<Response, ApiError> {
    check_origin(&headers, &state)?;
    if let Some(token) = token_from_cookie(&headers)
        && token.len() <= 64
    {
        sqlx::query("DELETE FROM sessions WHERE token_hash = $1")
            .bind(token_hash(token))
            .execute(&state.db)
            .await?;
    }

    attach_cookie(StatusCode::NO_CONTENT, expired_cookie(&state))
}

async fn me(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Account>, ApiError> {
    Ok(Json(signed_in_account(&state.db, &headers).await?))
}

async fn list_sessions(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<SessionSummary>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    let token = token_from_cookie(&headers).ok_or_else(ApiError::unauthorized)?;
    let sessions = store::list_sessions(&state.db, account.id, &token_hash(token)).await?;
    Ok(Json(sessions))
}

async fn revoke_session(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(session_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    let token = token_from_cookie(&headers).ok_or_else(ApiError::unauthorized)?;
    store::revoke_session(&state.db, account.id, session_id, &token_hash(token)).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn list_worlds(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<crate::models::World>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(store::list_worlds(&state.db, account.id).await?))
}

async fn create_world(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<WorldCreateInput>,
) -> Result<impl IntoResponse, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    let world = store::create_world(
        &state.db,
        account.id,
        input.name,
        input.description,
        input.genre,
    )
    .await?;

    Ok((StatusCode::CREATED, Json(world)))
}

async fn get_world(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<crate::models::World>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(store::get_world(&state.db, account.id, &slug).await?))
}

async fn list_documents(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<Vec<crate::models::CardDocument>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::list_documents(&state.db, account.id, &slug).await?,
    ))
}

async fn get_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, document_id)): Path<(String, Uuid)>,
) -> Result<Json<crate::models::CardDocument>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::get_document(&state.db, account.id, &slug, document_id).await?,
    ))
}

async fn create_card(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
    Json(input): Json<CardCreateInput>,
) -> Result<impl IntoResponse, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    let document = store::create_card(&state.db, account.id, &slug, input).await?;
    Ok((StatusCode::CREATED, Json(document)))
}

async fn update_card(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, document_id)): Path<(String, Uuid)>,
    Json(input): Json<CardUpdateInput>,
) -> Result<Json<crate::models::CardDocument>, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::update_card(&state.db, account.id, &slug, document_id, input).await?,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_normalization_is_case_insensitive() {
        assert_eq!(
            email_value("  VIREON@example.test ").unwrap(),
            "vireon@example.test"
        );
        assert!(email_value("not-an-email").is_err());
        assert!(email_value("a@@example.test").is_err());
    }

    #[test]
    fn password_length_is_bounded_without_trimming_user_input() {
        assert!(validate_password("correct horse battery").is_ok());
        assert!(validate_password("short").is_err());
        assert!(validate_password(&"x".repeat(129)).is_err());
    }
}
