use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: Uuid,
    pub email: String,
    pub display_name: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct World {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub description: String,
    pub genre: String,
    pub updated_at: String,
    pub documents: Vec<CardDocument>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardDocument {
    pub id: Uuid,
    pub kind: &'static str,
    pub entity_type: EntityType,
    pub name: String,
    pub aliases: Vec<String>,
    pub updated_at: String,
    pub version: i64,
    pub folder_id: Option<Uuid>,
    pub properties: Vec<CardProperty>,
    pub blocks: Vec<CardBlock>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: Uuid,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EntityType {
    Character,
    Place,
    Faction,
}

impl EntityType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Character => "character",
            Self::Place => "place",
            Self::Faction => "faction",
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum CardProperty {
    Text {
        id: String,
        label: String,
        value: String,
    },
    Reference {
        id: String,
        label: String,
        document_id: Uuid,
    },
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardBlock {
    pub id: String,
    #[serde(rename = "type")]
    pub block_type: &'static str,
    pub text: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterInput {
    pub email: String,
    pub display_name: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginInput {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldCreateInput {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub genre: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum CardPropertyInput {
    Text {
        id: String,
        label: String,
        value: String,
    },
    Reference {
        id: String,
        label: String,
        document_id: Uuid,
    },
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardBlockInput {
    pub id: String,
    pub text: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardCreateInput {
    pub name: String,
    pub entity_type: EntityType,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub properties: Vec<CardPropertyInput>,
    #[serde(default)]
    pub blocks: Vec<CardBlockInput>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderCreateInput {
    pub name: String,
    #[serde(default)]
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderUpdateInput {
    pub name: String,
    #[serde(default)]
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveDocumentInput {
    pub expected_version: i64,
    #[serde(default)]
    pub folder_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardUpdateInput {
    pub expected_version: i64,
    pub name: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub properties: Vec<CardPropertyInput>,
    #[serde(default)]
    pub blocks: Vec<CardBlockInput>,
}

#[derive(Debug, sqlx::FromRow)]
pub(crate) struct WorldRow {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub description: String,
    pub genre: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, sqlx::FromRow)]
pub(crate) struct DocumentRow {
    pub id: Uuid,
    pub entity_type: String,
    pub name: String,
    pub aliases: Vec<String>,
    pub updated_at: DateTime<Utc>,
    pub version: i64,
    pub folder_id: Option<Uuid>,
}

#[derive(Debug, sqlx::FromRow)]
pub(crate) struct FolderRow {
    pub id: Uuid,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, sqlx::FromRow)]
pub(crate) struct PropertyRow {
    pub document_id: Uuid,
    pub id: String,
    pub label: String,
    pub kind: String,
    pub text_value: Option<String>,
    pub reference_document_id: Option<Uuid>,
}

#[derive(Debug, sqlx::FromRow)]
pub(crate) struct BlockRow {
    pub document_id: Uuid,
    pub id: String,
    pub text: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub device_label: String,
    pub current: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaAssetSummary {
    pub id: Uuid,
    pub document_id: Option<Uuid>,
    pub file_name: String,
    pub content_type: String,
    pub size_bytes: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaUploadTicket {
    pub id: Uuid,
    pub upload_url: String,
    pub expires_at: DateTime<Utc>,
    pub content_type: String,
}

#[derive(Clone, Debug)]
pub struct MediaAssetCreate {
    pub id: Uuid,
    pub object_key: String,
    pub file_name: String,
    pub content_type: String,
    pub size_bytes: i64,
    pub document_id: Option<Uuid>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaUploadInput {
    pub file_name: String,
    pub content_type: String,
    pub size_bytes: i64,
    #[serde(default)]
    pub document_id: Option<Uuid>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentRevisionSummary {
    pub id: Uuid,
    pub version: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchivedDocumentSummary {
    pub id: Uuid,
    pub name: String,
    pub entity_type: EntityType,
    pub version: i64,
    pub archived_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentVersionInput {
    pub expected_version: i64,
}
