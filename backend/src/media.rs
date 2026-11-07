use std::time::Duration;

use aws_sdk_s3::{Client, config::Region, presigning::PresigningConfig};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
    time::timeout,
};

use crate::{config::StorageConfig, error::ApiError};

#[derive(Clone)]
pub struct MediaStore {
    client: Client,
    bucket: String,
}

pub struct StoredObject {
    pub size_bytes: i64,
    pub content_type: Option<String>,
}

impl MediaStore {
    pub async fn from_config(
        config: Option<&StorageConfig>,
    ) -> Result<Option<Self>, Box<dyn std::error::Error + Send + Sync>> {
        let Some(config) = config else {
            return Ok(None);
        };

        let shared = aws_config::defaults(aws_config::BehaviorVersion::latest())
            .region(Region::new(config.region.clone()))
            .load()
            .await;
        let mut builder = aws_sdk_s3::config::Builder::from(&shared);
        if let Some(endpoint) = config.endpoint_url.as_deref() {
            builder = builder.endpoint_url(endpoint);
        }
        let client = Client::from_conf(builder.force_path_style(config.force_path_style).build());

        Ok(Some(Self {
            client,
            bucket: config.bucket.clone(),
        }))
    }

    pub async fn presign_upload(
        &self,
        object_key: &str,
        content_type: &str,
    ) -> Result<String, ApiError> {
        let request = self
            .client
            .put_object()
            .bucket(&self.bucket)
            .key(object_key)
            .content_type(content_type)
            .presigned(
                PresigningConfig::expires_in(Duration::from_secs(300))
                    .map_err(|_| ApiError::internal())?,
            )
            .await
            .map_err(|error| {
                tracing::error!(error = %error, "could not presign a private upload");
                ApiError::internal()
            })?;

        Ok(request.uri().to_string())
    }

    pub async fn inspect(&self, object_key: &str) -> Result<StoredObject, ApiError> {
        let object = self
            .client
            .head_object()
            .bucket(&self.bucket)
            .key(object_key)
            .send()
            .await
            .map_err(|error| {
                tracing::error!(error = %error, "could not inspect a private media object");
                ApiError::conflict("Upload the file before completing the media record.")
            })?;

        Ok(StoredObject {
            size_bytes: object.content_length().unwrap_or(-1),
            content_type: object.content_type().map(str::to_owned),
        })
    }

    pub async fn scan(&self, object_key: &str, scanner_address: &str) -> Result<bool, ApiError> {
        let scan = async {
            let object = self
                .client
                .get_object()
                .bucket(&self.bucket)
                .key(object_key)
                .send()
                .await
                .map_err(|_| ApiError::service_unavailable())?;
            let mut body = object.body.into_async_read();
            let mut scanner = TcpStream::connect(scanner_address)
                .await
                .map_err(|_| ApiError::service_unavailable())?;

            scanner
                .write_all(b"zINSTREAM\0")
                .await
                .map_err(|_| ApiError::service_unavailable())?;

            let mut buffer = [0_u8; 64 * 1024];
            loop {
                let count = body
                    .read(&mut buffer)
                    .await
                    .map_err(|_| ApiError::service_unavailable())?;
                if count == 0 {
                    break;
                }
                scanner
                    .write_all(&(count as u32).to_be_bytes())
                    .await
                    .map_err(|_| ApiError::service_unavailable())?;
                scanner
                    .write_all(&buffer[..count])
                    .await
                    .map_err(|_| ApiError::service_unavailable())?;
            }

            scanner
                .write_all(&0_u32.to_be_bytes())
                .await
                .map_err(|_| ApiError::service_unavailable())?;

            let mut reply = Vec::with_capacity(128);
            loop {
                let mut byte = [0_u8; 1];
                let count = scanner
                    .read(&mut byte)
                    .await
                    .map_err(|_| ApiError::service_unavailable())?;
                if count == 0 || byte[0] == 0 {
                    break;
                }
                if reply.len() >= 1024 {
                    return Err(ApiError::service_unavailable());
                }
                reply.push(byte[0]);
            }

            scan_reply_is_clean(&reply)
        };

        match timeout(Duration::from_secs(300), scan).await {
            Ok(result) => result,
            Err(_) => Err(ApiError::service_unavailable()),
        }
    }

    pub async fn presign_download(&self, object_key: &str) -> Result<String, ApiError> {
        let request = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(object_key)
            .presigned(
                PresigningConfig::expires_in(Duration::from_secs(300))
                    .map_err(|_| ApiError::internal())?,
            )
            .await
            .map_err(|error| {
                tracing::error!(error = %error, "could not presign a private download");
                ApiError::internal()
            })?;

        Ok(request.uri().to_string())
    }

    pub async fn delete(&self, object_key: &str) -> Result<(), ApiError> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(object_key)
            .send()
            .await
            .map_err(|error| {
                tracing::error!(error = %error, "could not delete a private media object");
                ApiError::internal()
            })?;
        Ok(())
    }
}

fn scan_reply_is_clean(reply: &[u8]) -> Result<bool, ApiError> {
    let response = std::str::from_utf8(reply)
        .map_err(|_| ApiError::service_unavailable())?
        .trim();

    if response.ends_with(" OK") {
        Ok(true)
    } else if response.contains(" FOUND") {
        Ok(false)
    } else {
        Err(ApiError::service_unavailable())
    }
}

#[cfg(test)]
mod tests {
    use super::scan_reply_is_clean;

    #[test]
    fn clamd_reply_distinguishes_clean_and_infected_streams() {
        assert!(scan_reply_is_clean(b"stream: OK").expect("clean result"));
        assert!(!scan_reply_is_clean(b"stream: Test-Signature FOUND").expect("infected result"));
        assert!(scan_reply_is_clean(b"stream: ERROR").is_err());
        assert!(scan_reply_is_clean(b"").is_err());
    }
}
