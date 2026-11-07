pub mod api;
pub mod config;
pub mod error;
pub mod media;
pub mod models;
pub mod store;

use sqlx::PgPool;

use crate::{config::Config, media::MediaStore};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Config,
    pub media: Option<MediaStore>,
}

pub fn router(state: AppState) -> axum::Router {
    api::router(state)
}
