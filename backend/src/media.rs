use std::time::Duration;

use aws_sdk_s3::{Client, config::Region, presigning::PresigningConfig};

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
