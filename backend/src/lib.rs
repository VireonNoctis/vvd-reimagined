pub mod api;
pub mod config;
pub mod error;
pub mod models;
pub mod store;

use sqlx::PgPool;

use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Config,
}

pub fn router(state: AppState) -> axum::Router {
    api::router(state)
}
