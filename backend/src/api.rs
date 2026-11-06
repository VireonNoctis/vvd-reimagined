use argon2::{
    Argon2,
    password_hash::{PasswordHasher, PasswordVerifier, phc::PasswordHash},
};
use axum::{
    Json, Router,
    extract::{ConnectInfo, Path, Query, State},
    http::{
        HeaderMap, HeaderValue, StatusCode,
        header::{CACHE_CONTROL, COOKIE, ORIGIN, SET_COOKIE, USER_AGENT},
    },
    response::{IntoResponse, Redirect, Response},
    routing::{delete, get, patch, post},
};
use chrono::{Duration as ChronoDuration, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{PgConnection, PgPool};
use std::net::SocketAddr;
use uuid::Uuid;

use crate::{
    AppState,
    error::ApiError,
    models::{
        Account, ArchivedDocumentSummary, CardCreateInput, CardTemplateCreateInput,
        CardTemplateSummary, CardTemplateUpdateInput, CardUpdateInput, DocumentRevisionSummary,
        DocumentTypeSummary, DocumentVersionInput, EraCreateInput, EraSummary, Folder,
        FolderCreateInput, FolderUpdateInput, GraphLayoutCreateInput, GraphLayoutSummary,
        GraphLayoutUpdateInput, LoginInput, MediaAssetCreate, MediaAssetSummary, MediaUploadInput,
        MediaUploadTicket, MoveDocumentInput, RegisterInput, SessionSummary, WorldCreateInput,
    },
    store,
};

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EraQuery {
    era_id: Option<Uuid>,
}

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

fn check_fetch_site(headers: &HeaderMap) -> Result<(), ApiError> {
    let Some(value) = headers.get("sec-fetch-site") else {
        // Non-browser API clients do not send Fetch Metadata headers.
        return Ok(());
    };
    let site = value
        .to_str()
        .map_err(|_| ApiError::bad_request("Invalid request context."))?
        .trim()
        .to_ascii_lowercase();

    if matches!(site.as_str(), "same-origin" | "none") {
        Ok(())
    } else {
        Err(ApiError::forbidden())
    }
}

fn check_origin(headers: &HeaderMap, state: &AppState) -> Result<(), ApiError> {
    check_fetch_site(headers)?;
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

async fn security_headers(
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(CACHE_CONTROL, HeaderValue::from_static("no-store"));
    headers.insert(
        "x-content-type-options",
        HeaderValue::from_static("nosniff"),
    );
    headers.insert("x-frame-options", HeaderValue::from_static("DENY"));
    headers.insert(
        "referrer-policy",
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        "permissions-policy",
        HeaderValue::from_static("camera=(), geolocation=()"),
    );
    response
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
        .route("/v1/worlds/{slug}/eras", get(list_eras).post(create_era))
        .route("/v1/worlds/{slug}/document-types", get(list_document_types))
        .route(
            "/v1/worlds/{slug}/graph-layouts",
            get(list_graph_layouts).post(create_graph_layout),
        )
        .route(
            "/v1/worlds/{slug}/graph-layouts/{layout_id}",
            patch(update_graph_layout).delete(delete_graph_layout),
        )
        .route(
            "/v1/worlds/{slug}/card-templates",
            get(list_card_templates).post(create_card_template),
        )
        .route(
            "/v1/worlds/{slug}/card-templates/{template_id}",
            patch(update_card_template).delete(delete_card_template),
        )
        .route(
            "/v1/worlds/{slug}/documents",
            get(list_documents).post(create_card),
        )
        .route(
            "/v1/worlds/{slug}/documents/{document_id}",
            get(get_document).patch(update_card),
        )
        .route(
            "/v1/worlds/{slug}/folders",
            get(list_folders).post(create_folder),
        )
        .route(
            "/v1/worlds/{slug}/folders/{folder_id}",
            patch(update_folder).delete(delete_folder),
        )
        .route(
            "/v1/worlds/{slug}/documents/{document_id}/move",
            post(move_document),
        )
        .route("/v1/worlds/{slug}/media", get(list_media_assets))
        .route("/v1/worlds/{slug}/media/uploads", post(create_media_upload))
        .route(
            "/v1/worlds/{slug}/media/{media_id}/complete",
            post(complete_media_upload),
        )
        .route(
            "/v1/worlds/{slug}/media/{media_id}/download",
            get(download_media_asset),
        )
        .route(
            "/v1/worlds/{slug}/media/{media_id}",
            delete(delete_media_asset),
        )
        .route(
            "/v1/worlds/{slug}/documents/{document_id}/media/{media_id}",
            post(attach_media_asset).delete(detach_media_asset),
        )
        .route("/v1/worlds/{slug}/archive", get(list_archived_documents))
        .route(
            "/v1/worlds/{slug}/documents/{document_id}/archive",
            post(archive_document),
        )
        .route(
            "/v1/worlds/{slug}/documents/{document_id}/restore",
            post(restore_archived_document),
        )
        .route(
            "/v1/worlds/{slug}/documents/{document_id}/revisions",
            get(list_document_revisions),
        )
        .route(
            "/v1/worlds/{slug}/documents/{document_id}/revisions/{revision_id}/restore",
            post(restore_document_revision),
        )
        .with_state(state)
        .layer(axum::middleware::from_fn(security_headers))
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
    Query(query): Query<EraQuery>,
) -> Result<Json<crate::models::World>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::get_world(&state.db, account.id, &slug, query.era_id).await?,
    ))
}

async fn list_eras(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<Vec<EraSummary>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(store::list_eras(&state.db, account.id, &slug).await?))
}

async fn create_era(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
    Json(input): Json<EraCreateInput>,
) -> Result<impl IntoResponse, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    let era = store::create_era(&state.db, account.id, &slug, input).await?;
    Ok((StatusCode::CREATED, Json(era)))
}

const MAX_IMAGE_BYTES: i64 = 50 * 1024 * 1024;
const MAX_AUDIO_BYTES: i64 = 60 * 1024 * 1024;
const MAX_VIDEO_BYTES: i64 = 250 * 1024 * 1024;

fn validate_media_upload(input: &MediaUploadInput) -> Result<(String, String), ApiError> {
    let content_type = input.content_type.trim().to_ascii_lowercase();
    let max_size = match content_type.as_str() {
        "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/avif" => MAX_IMAGE_BYTES,
        "audio/mpeg" | "audio/mp4" | "audio/ogg" | "audio/wav" => MAX_AUDIO_BYTES,
        "video/mp4" | "video/webm" => MAX_VIDEO_BYTES,
        _ => {
            return Err(ApiError::bad_request(
                "This file type is not supported by the private Gallery.",
            ));
        }
    };
    if input.size_bytes <= 0 || input.size_bytes > max_size {
        return Err(ApiError::bad_request(
            "This file is empty or exceeds the upload limit for its type.",
        ));
    }

    let file_name = input
        .file_name
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or_default()
        .chars()
        .filter(|character| !character.is_control())
        .take(180)
        .collect::<String>()
        .trim()
        .to_owned();
    if file_name.is_empty() || file_name == "." || file_name == ".." {
        return Err(ApiError::bad_request("Enter a valid file name."));
    }

    Ok((file_name, content_type))
}

async fn create_media_upload(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
    Json(input): Json<MediaUploadInput>,
) -> Result<impl IntoResponse, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    let storage = state
        .media
        .as_ref()
        .ok_or_else(ApiError::service_unavailable)?;
    let (file_name, content_type) = validate_media_upload(&input)?;
    let asset_id = Uuid::new_v4();
    let object_key = format!("assets/{}", asset_id.simple());
    let upload_url = storage.presign_upload(&object_key, &content_type).await?;
    let expires_at = Utc::now() + ChronoDuration::minutes(15);

    store::create_media_asset(
        &state.db,
        account.id,
        &slug,
        MediaAssetCreate {
            id: asset_id,
            object_key,
            file_name,
            content_type: content_type.clone(),
            size_bytes: input.size_bytes,
            document_id: input.document_id,
            expires_at,
        },
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(MediaUploadTicket {
            id: asset_id,
            upload_url,
            expires_at,
            content_type,
        }),
    ))
}

async fn complete_media_upload(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, media_id)): Path<(String, Uuid)>,
) -> Result<Json<MediaAssetSummary>, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    let storage = state
        .media
        .as_ref()
        .ok_or_else(ApiError::service_unavailable)?;
    let (object_key, content_type, size_bytes) =
        store::pending_media_upload(&state.db, account.id, &slug, media_id).await?;
    let stored = storage.inspect(&object_key).await?;

    if stored.size_bytes != size_bytes || stored.content_type.as_deref() != Some(&content_type) {
        let _ = storage.delete(&object_key).await;
        store::reject_media_upload(&state.db, account.id, &slug, media_id).await?;
        return Err(ApiError::bad_request(
            "The uploaded file does not match the requested type or size.",
        ));
    }

    Ok(Json(
        store::complete_media_upload(&state.db, account.id, &slug, media_id).await?,
    ))
}

async fn attach_media_asset(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, document_id, media_id)): Path<(String, Uuid, Uuid)>,
) -> Result<Json<crate::models::MediaAssetSummary>, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::attach_media_asset(&state.db, account.id, &slug, document_id, media_id).await?,
    ))
}

async fn detach_media_asset(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, document_id, media_id)): Path<(String, Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    store::detach_media_asset(&state.db, account.id, &slug, document_id, media_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn list_media_assets(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<Vec<MediaAssetSummary>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::list_media_assets(&state.db, account.id, &slug).await?,
    ))
}

async fn download_media_asset(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, media_id)): Path<(String, Uuid)>,
) -> Result<Response, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    let storage = state
        .media
        .as_ref()
        .ok_or_else(ApiError::service_unavailable)?;
    let object_key = store::media_object_key(&state.db, account.id, &slug, media_id, false).await?;
    let url = storage.presign_download(&object_key).await?;
    let mut response = Redirect::temporary(&url).into_response();
    response
        .headers_mut()
        .insert(CACHE_CONTROL, HeaderValue::from_static("private, no-store"));
    Ok(response)
}

async fn delete_media_asset(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, media_id)): Path<(String, Uuid)>,
) -> Result<StatusCode, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    let storage = state
        .media
        .as_ref()
        .ok_or_else(ApiError::service_unavailable)?;
    let world_id = store::require_world(&state.db, account.id, &slug, true).await?;
    let mut transaction = state.db.begin().await?;
    let object_key =
        store::lock_media_asset_for_deletion(&mut transaction, world_id, media_id).await?;
    storage.delete(&object_key).await?;
    store::mark_media_asset_deleted(&mut transaction, world_id, media_id).await?;
    transaction.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn list_folders(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<Vec<Folder>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::list_folders(&state.db, account.id, &slug).await?,
    ))
}

async fn create_folder(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
    Json(input): Json<FolderCreateInput>,
) -> Result<impl IntoResponse, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    let folder = store::create_folder(&state.db, account.id, &slug, input).await?;
    Ok((StatusCode::CREATED, Json(folder)))
}

async fn update_folder(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, folder_id)): Path<(String, Uuid)>,
    Json(input): Json<FolderUpdateInput>,
) -> Result<Json<Folder>, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::update_folder(&state.db, account.id, &slug, folder_id, input).await?,
    ))
}

async fn delete_folder(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, folder_id)): Path<(String, Uuid)>,
) -> Result<StatusCode, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    store::delete_folder(&state.db, account.id, &slug, folder_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn move_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, document_id)): Path<(String, Uuid)>,
    Json(input): Json<MoveDocumentInput>,
) -> Result<Json<crate::models::CardDocument>, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::move_document(&state.db, account.id, &slug, document_id, input).await?,
    ))
}

async fn list_archived_documents(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<Vec<ArchivedDocumentSummary>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::list_archived_documents(&state.db, account.id, &slug).await?,
    ))
}

async fn archive_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, document_id)): Path<(String, Uuid)>,
    Json(input): Json<DocumentVersionInput>,
) -> Result<StatusCode, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    store::archive_document(
        &state.db,
        account.id,
        &slug,
        document_id,
        input.expected_version,
    )
    .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn restore_archived_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, document_id)): Path<(String, Uuid)>,
    Json(input): Json<DocumentVersionInput>,
) -> Result<StatusCode, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    store::restore_archived_document(
        &state.db,
        account.id,
        &slug,
        document_id,
        input.expected_version,
    )
    .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn list_document_revisions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, document_id)): Path<(String, Uuid)>,
) -> Result<Json<Vec<DocumentRevisionSummary>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::list_document_revisions(&state.db, account.id, &slug, document_id).await?,
    ))
}

async fn restore_document_revision(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, document_id, revision_id)): Path<(String, Uuid, Uuid)>,
    Json(input): Json<DocumentVersionInput>,
) -> Result<Json<crate::models::CardDocument>, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::restore_document_revision(
            &state.db,
            account.id,
            &slug,
            document_id,
            revision_id,
            input.expected_version,
        )
        .await?,
    ))
}

async fn list_graph_layouts(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
    Query(query): Query<EraQuery>,
) -> Result<Json<Vec<GraphLayoutSummary>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::list_graph_layouts(&state.db, account.id, &slug, query.era_id).await?,
    ))
}

async fn create_graph_layout(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
    Json(input): Json<GraphLayoutCreateInput>,
) -> Result<impl IntoResponse, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    let layout = store::create_graph_layout(&state.db, account.id, &slug, input).await?;
    Ok((StatusCode::CREATED, Json(layout)))
}

async fn update_graph_layout(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, layout_id)): Path<(String, Uuid)>,
    Json(input): Json<GraphLayoutUpdateInput>,
) -> Result<Json<GraphLayoutSummary>, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::update_graph_layout(&state.db, account.id, &slug, layout_id, input).await?,
    ))
}

async fn delete_graph_layout(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, layout_id)): Path<(String, Uuid)>,
) -> Result<StatusCode, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    store::delete_graph_layout(&state.db, account.id, &slug, layout_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn list_document_types(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<Vec<DocumentTypeSummary>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::list_document_types(&state.db, account.id, &slug).await?,
    ))
}

async fn list_card_templates(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<Vec<CardTemplateSummary>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::list_card_templates(&state.db, account.id, &slug).await?,
    ))
}

async fn create_card_template(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
    Json(input): Json<CardTemplateCreateInput>,
) -> Result<impl IntoResponse, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    let template = store::create_card_template(&state.db, account.id, &slug, input).await?;
    Ok((StatusCode::CREATED, Json(template)))
}

async fn update_card_template(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, template_id)): Path<(String, Uuid)>,
    Json(input): Json<CardTemplateUpdateInput>,
) -> Result<Json<CardTemplateSummary>, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::update_card_template(&state.db, account.id, &slug, template_id, input).await?,
    ))
}

async fn delete_card_template(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, template_id)): Path<(String, Uuid)>,
) -> Result<StatusCode, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    store::delete_card_template(&state.db, account.id, &slug, template_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn list_documents(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
    Query(query): Query<EraQuery>,
) -> Result<Json<Vec<crate::models::CardDocument>>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::list_documents(&state.db, account.id, &slug, query.era_id).await?,
    ))
}

async fn get_document(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((slug, document_id)): Path<(String, Uuid)>,
    Query(query): Query<EraQuery>,
) -> Result<Json<crate::models::CardDocument>, ApiError> {
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::get_document(&state.db, account.id, &slug, document_id, query.era_id).await?,
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
    Query(query): Query<EraQuery>,
    Json(input): Json<CardUpdateInput>,
) -> Result<Json<crate::models::CardDocument>, ApiError> {
    check_origin(&headers, &state)?;
    let account = signed_in_account(&state.db, &headers).await?;
    Ok(Json(
        store::update_card(
            &state.db,
            account.id,
            &slug,
            document_id,
            query.era_id,
            input,
        )
        .await?,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn private_gallery_uploads_strip_paths_and_enforce_type_and_size() {
        let input = MediaUploadInput {
            file_name: "folder\\portrait.png".to_owned(),
            content_type: " IMAGE/PNG ".to_owned(),
            size_bytes: 1_024,
            document_id: None,
        };
        let (name, content_type) = validate_media_upload(&input).expect("valid image upload");
        assert_eq!(name, "portrait.png");
        assert_eq!(content_type, "image/png");

        let unsupported = MediaUploadInput {
            content_type: "image/svg+xml".to_owned(),
            ..input
        };
        assert!(validate_media_upload(&unsupported).is_err());

        let oversized = MediaUploadInput {
            file_name: "large.mp4".to_owned(),
            content_type: "video/mp4".to_owned(),
            size_bytes: MAX_VIDEO_BYTES + 1,
            document_id: None,
        };
        assert!(validate_media_upload(&oversized).is_err());
    }

    #[test]
    fn fetch_metadata_rejects_cross_site_and_same_site_requests() {
        for site in ["cross-site", "same-site", "invalid"] {
            let mut headers = HeaderMap::new();
            headers.insert("sec-fetch-site", HeaderValue::from_static(site));
            assert!(
                check_fetch_site(&headers).is_err(),
                "{site} must be rejected"
            );
        }
    }

    #[test]
    fn fetch_metadata_allows_same_origin_and_non_browser_clients() {
        let mut headers = HeaderMap::new();
        assert!(check_fetch_site(&headers).is_ok());

        headers.insert("sec-fetch-site", HeaderValue::from_static("same-origin"));
        assert!(check_fetch_site(&headers).is_ok());

        headers.insert("sec-fetch-site", HeaderValue::from_static("none"));
        assert!(check_fetch_site(&headers).is_ok());
    }

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
