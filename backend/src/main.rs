use std::error::Error;

use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;
use vvd_api::{AppState, config::Config, media::MediaStore, router};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let config = Config::from_env()?;
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(&config.database_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;
    let media = MediaStore::from_config(config.storage.as_ref()).await?;
    if let Some(storage) = media.clone() {
        let cleanup_db = pool.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));
            loop {
                interval.tick().await;
                match storage.cleanup_expired(&cleanup_db, 50).await {
                    Ok(removed) if removed > 0 => {
                        tracing::info!(removed, "expired Gallery objects removed");
                    }
                    Ok(_) => {}
                    Err(_) => tracing::warn!("expired Gallery cleanup cycle failed"),
                }
            }
        });
    }
    let address = config.bind_address;
    let app = router(AppState {
        db: pool,
        config,
        media,
    });
    let listener = TcpListener::bind(address).await?;

    tracing::info!(%address, "vvd API listening");
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(async {
        let _ = tokio::signal::ctrl_c().await;
    })
    .await?;

    Ok(())
}
