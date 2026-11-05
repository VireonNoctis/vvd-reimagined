use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    message: &'static str,
}

#[derive(Serialize)]
struct ErrorBody {
    error: &'static str,
}

impl ApiError {
    pub const fn bad_request(message: &'static str) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message,
        }
    }

    pub const fn unauthorized() -> Self {
        Self {
            status: StatusCode::UNAUTHORIZED,
            message: "Sign in to continue.",
        }
    }

    pub const fn forbidden() -> Self {
        Self {
            status: StatusCode::FORBIDDEN,
            message: "You do not have permission to do that.",
        }
    }

    pub const fn not_found() -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            message: "The requested resource was not found.",
        }
    }

    pub const fn conflict(message: &'static str) -> Self {
        Self {
            status: StatusCode::CONFLICT,
            message,
        }
    }

    pub const fn rate_limited() -> Self {
        Self {
            status: StatusCode::TOO_MANY_REQUESTS,
            message: "Too many attempts. Try again in 15 minutes.",
        }
    }

    pub const fn internal() -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: "The request could not be completed.",
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(ErrorBody {
                error: self.message,
            }),
        )
            .into_response()
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(error: sqlx::Error) -> Self {
        if let sqlx::Error::Database(database_error) = &error {
            match database_error.code().as_deref() {
                Some("23505") => {
                    return Self::conflict("A record with those details already exists.");
                }
                Some("23503") => {
                    return Self::bad_request("A referenced record does not exist in this world.");
                }
                Some("23514") => {
                    return Self::bad_request(
                        "The supplied data does not satisfy the document rules.",
                    );
                }
                _ => {}
            }
        }

        tracing::error!(error = %error, "database request failed");
        Self::internal()
    }
}
