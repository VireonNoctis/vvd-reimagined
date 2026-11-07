use std::{env, net::SocketAddr};

#[derive(Clone)]
pub struct StorageConfig {
    pub bucket: String,
    pub region: String,
    pub endpoint_url: Option<String>,
    pub force_path_style: bool,
}

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub bind_address: SocketAddr,
    pub secure_cookies: bool,
    pub allowed_origin: Option<String>,
    pub storage: Option<StorageConfig>,
    pub clamav_address: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let database_url = env::var("DATABASE_URL").map_err(|_| {
            std::io::Error::other("DATABASE_URL must be set before starting the API")
        })?;
        let bind_address = env::var("BIND_ADDRESS")
            .unwrap_or_else(|_| "127.0.0.1:4100".to_owned())
            .parse()?;
        let app_env = env::var("APP_ENV").unwrap_or_else(|_| "development".to_owned());
        let secure_cookies = env::var("COOKIE_SECURE")
            .map(|value| value.eq_ignore_ascii_case("true"))
            .unwrap_or_else(|_| app_env.eq_ignore_ascii_case("production"));
        let allowed_origin = env::var("APP_ORIGIN")
            .ok()
            .filter(|value| !value.trim().is_empty());

        if app_env.eq_ignore_ascii_case("production") && allowed_origin.is_none() {
            return Err("APP_ORIGIN is required in production".into());
        }

        let clamav_address = env::var("VVD_CLAMAV_ADDRESS")
            .ok()
            .filter(|value| !value.trim().is_empty());
        if clamav_address.as_deref().is_some_and(|value| value.contains('/') || value.chars().any(char::is_whitespace)) {
            return Err("VVD_CLAMAV_ADDRESS must be a private host:port address".into());
        }

        let bucket = env::var("VVD_S3_BUCKET")
            .ok()
            .filter(|value| !value.trim().is_empty());
        let region = env::var("VVD_S3_REGION")
            .ok()
            .filter(|value| !value.trim().is_empty());
        let endpoint_url = env::var("VVD_S3_ENDPOINT")
            .ok()
            .filter(|value| !value.trim().is_empty());
        let storage_configured = bucket.is_some() || region.is_some() || endpoint_url.is_some();
        let storage = if storage_configured {
            let (Some(bucket), Some(region)) = (bucket, region) else {
                return Err("VVD_S3_BUCKET and VVD_S3_REGION must be set together".into());
            };
            if app_env.eq_ignore_ascii_case("production")
                && endpoint_url
                    .as_deref()
                    .is_some_and(|endpoint| !endpoint.starts_with("https://"))
            {
                return Err("VVD_S3_ENDPOINT must use HTTPS in production".into());
            }
            let force_path_style = env::var("VVD_S3_FORCE_PATH_STYLE")
                .map(|value| value.eq_ignore_ascii_case("true"))
                .unwrap_or_else(|_| endpoint_url.is_some());
            Some(StorageConfig {
                bucket,
                region,
                endpoint_url,
                force_path_style,
            })
        } else {
            None
        };

        Ok(Self {
            database_url,
            bind_address,
            secure_cookies,
            allowed_origin,
            storage,
            clamav_address,
        })
    }
}
