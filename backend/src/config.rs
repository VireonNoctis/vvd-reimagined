use std::{env, net::SocketAddr};

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub bind_address: SocketAddr,
    pub secure_cookies: bool,
    pub allowed_origin: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| std::io::Error::other("DATABASE_URL must be set before starting the API"))?;
        let bind_address = env::var("BIND_ADDRESS")
            .unwrap_or_else(|_| "127.0.0.1:4100".to_owned())
            .parse()?;
        let app_env = env::var("APP_ENV").unwrap_or_else(|_| "development".to_owned());
        let secure_cookies = env::var("COOKIE_SECURE")
            .map(|value| value.eq_ignore_ascii_case("true"))
            .unwrap_or_else(|_| app_env.eq_ignore_ascii_case("production"));
        let allowed_origin = env::var("APP_ORIGIN").ok().filter(|value| !value.trim().is_empty());

        if app_env.eq_ignore_ascii_case("production") && allowed_origin.is_none() {
            return Err("APP_ORIGIN is required in production".into());
        }

        Ok(Self {
            database_url,
            bind_address,
            secure_cookies,
            allowed_origin,
        })
    }
}
