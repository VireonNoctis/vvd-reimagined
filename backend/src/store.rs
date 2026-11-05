use std::collections::HashMap;

use chrono::{DateTime, Utc};
use sqlx::{PgConnection, PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::{
    error::ApiError,
    models::{
        CardBlock, CardBlockInput, CardCreateInput, CardDocument, CardProperty, CardPropertyInput,
        CardUpdateInput, DocumentRow, EntityType, PropertyRow, World, WorldRow, BlockRow,
    },
};

fn date_label(value: DateTime<Utc>) -> String {
    value.date_naive().format("%Y-%m-%d").to_string()
}

fn entity_type(value: &str) -> Result<EntityType, ApiError> {
    match value {
        "character" => Ok(EntityType::Character),
        "place" => Ok(EntityType::Place),
        "faction" => Ok(EntityType::Faction),
        _ => Err(ApiError::internal()),
    }
}

fn slug_part(value: &str) -> String {
    let mut output = String::new();
    let mut separator = false;

    for character in value.chars() {
        if character.is_ascii_alphanumeric() {
            if separator && !output.is_empty() {
                output.push('-');
            }
            output.push(character.to_ascii_lowercase());
            separator = false;
        } else {
            separator = true;
        }
    }

    if output.is_empty() { "world".to_owned() } else { output }
}

fn validate_key(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-' || byte == b'_')
}

fn validate_aliases(aliases: &[String]) -> Result<(), ApiError> {
    if aliases.len() > 50 {
        return Err(ApiError::bad_request("A card can have at most 50 aliases."));
    }

    let mut seen = std::collections::HashSet::new();
    for alias in aliases {
        let clean = alias.trim();
        if clean.is_empty() || clean.chars().count() > 100 {
            return Err(ApiError::bad_request("Aliases must contain between 1 and 100 characters."));
        }
        if !seen.insert(clean.to_lowercase()) {
            return Err(ApiError::bad_request("Aliases must be unique."));
        }
    }

    Ok(())
}

fn validate_card_content(
    name: &str,
    aliases: &[String],
    properties: &[CardPropertyInput],
    blocks: &[CardBlockInput],
) -> Result<(), ApiError> {
    if name.trim().is_empty() || name.chars().count() > 120 {
        return Err(ApiError::bad_request("Card names must contain between 1 and 120 characters."));
    }
    validate_aliases(aliases)?;

    if properties.len() > 100 {
        return Err(ApiError::bad_request("A card can have at most 100 properties."));
    }

    let mut property_ids = std::collections::HashSet::new();
    for property in properties {
        let (id, label) = match property {
            CardPropertyInput::Text { id, label, value } => {
                if value.chars().count() > 10_000 {
                    return Err(ApiError::bad_request("Text properties are limited to 10,000 characters."));
                }
                (id, label)
            }
            CardPropertyInput::Reference { id, label, .. } => (id, label),
        };

        if !validate_key(id) || !property_ids.insert(id) {
            return Err(ApiError::bad_request("Property ids must be unique lowercase keys."));
        }
        if label.trim().is_empty() || label.chars().count() > 100 {
            return Err(ApiError::bad_request("Property labels must contain between 1 and 100 characters."));
        }
    }

    if blocks.len() > 200 {
        return Err(ApiError::bad_request("A card can have at most 200 body blocks."));
    }

    let mut block_ids = std::collections::HashSet::new();
    for block in blocks {
        if !validate_key(&block.id) || !block_ids.insert(&block.id) {
            return Err(ApiError::bad_request("Body block ids must be unique lowercase keys."));
        }
        if block.text.chars().count() > 50_000 {
            return Err(ApiError::bad_request("A body block is limited to 50,000 characters."));
        }
    }

    Ok(())
}

pub async fn require_world(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    write: bool,
) -> Result<Uuid, ApiError> {
    let membership = sqlx::query_as::<_, (Uuid, String)>(
        "SELECT w.id, m.role
         FROM worlds w
         INNER JOIN world_memberships m ON m.world_id = w.id
         WHERE w.slug = $1 AND m.account_id = $2",
    )
    .bind(slug)
    .bind(account_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(ApiError::not_found)?;

    if write && !matches!(membership.1.as_str(), "owner" | "admin" | "editor") {
        return Err(ApiError::forbidden());
    }

    Ok(membership.0)
}

async fn load_documents(pool: &PgPool, world_id: Uuid) -> Result<Vec<CardDocument>, ApiError> {
    let documents = sqlx::query_as::<_, DocumentRow>(
        "SELECT id, entity_type, name, aliases, updated_at, version
         FROM documents
         WHERE world_id = $1
         ORDER BY name ASC, id ASC",
    )
    .bind(world_id)
    .fetch_all(pool)
    .await?;

    if documents.is_empty() {
        return Ok(Vec::new());
    }

    let properties = sqlx::query_as::<_, PropertyRow>(
        "SELECT document_id, id, label, kind, text_value, reference_document_id
         FROM card_properties
         WHERE world_id = $1
         ORDER BY document_id, id",
    )
    .bind(world_id)
    .fetch_all(pool)
    .await?;

    let blocks = sqlx::query_as::<_, BlockRow>(
        "SELECT document_id, id, position, text
         FROM card_blocks
         WHERE world_id = $1
         ORDER BY document_id, position",
    )
    .bind(world_id)
    .fetch_all(pool)
    .await?;

    let mut properties_by_document: HashMap<Uuid, Vec<CardProperty>> = HashMap::new();
    for row in properties {
        let property = match row.kind.as_str() {
            "text" => CardProperty::Text {
                id: row.id,
                label: row.label,
                value: row.text_value.ok_or_else(ApiError::internal)?,
            },
            "reference" => CardProperty::Reference {
                id: row.id,
                label: row.label,
                document_id: row.reference_document_id.ok_or_else(ApiError::internal)?,
            },
            _ => return Err(ApiError::internal()),
        };
        properties_by_document.entry(row.document_id).or_default().push(property);
    }

    let mut blocks_by_document: HashMap<Uuid, Vec<CardBlock>> = HashMap::new();
    for row in blocks {
        blocks_by_document.entry(row.document_id).or_default().push(CardBlock {
            id: row.id,
            block_type: "text",
            text: row.text,
        });
    }

    documents
        .into_iter()
        .map(|row| {
            Ok(CardDocument {
                id: row.id,
                kind: "card",
                entity_type: entity_type(&row.entity_type)?,
                name: row.name,
                aliases: row.aliases,
                updated_at: date_label(row.updated_at),
                version: row.version,
                properties: properties_by_document.remove(&row.id).unwrap_or_default(),
                blocks: blocks_by_document.remove(&row.id).unwrap_or_default(),
            })
        })
        .collect()
}

async fn load_world(pool: &PgPool, world_id: Uuid) -> Result<World, ApiError> {
    let row = sqlx::query_as::<_, WorldRow>(
        "SELECT id, slug, name, description, genre, updated_at
         FROM worlds WHERE id = $1",
    )
    .bind(world_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(ApiError::not_found)?;

    let documents = load_documents(pool, world_id).await?;
    Ok(World {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        genre: row.genre,
        updated_at: date_label(row.updated_at),
        documents,
    })
}

pub async fn list_worlds(pool: &PgPool, account_id: Uuid) -> Result<Vec<World>, ApiError> {
    let rows = sqlx::query_as::<_, WorldRow>(
        "SELECT w.id, w.slug, w.name, w.description, w.genre, w.updated_at
         FROM worlds w
         INNER JOIN world_memberships m ON m.world_id = w.id
         WHERE m.account_id = $1
         ORDER BY w.updated_at DESC, w.name ASC",
    )
    .bind(account_id)
    .fetch_all(pool)
    .await?;

    let mut worlds = Vec::with_capacity(rows.len());
    for row in rows {
        let documents = load_documents(pool, row.id).await?;
        worlds.push(World {
            id: row.id,
            slug: row.slug,
            name: row.name,
            description: row.description,
            genre: row.genre,
            updated_at: date_label(row.updated_at),
            documents,
        });
    }

    Ok(worlds)
}

pub async fn get_world(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
) -> Result<World, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    load_world(pool, world_id).await
}

pub async fn create_world(
    pool: &PgPool,
    account_id: Uuid,
    name: String,
    description: String,
    genre: String,
) -> Result<World, ApiError> {
    if name.trim().is_empty() || name.chars().count() > 100 {
        return Err(ApiError::bad_request("World names must contain between 1 and 100 characters."));
    }
    if description.chars().count() > 2_000 || genre.chars().count() > 80 {
        return Err(ApiError::bad_request("The description or genre is too long."));
    }

    let id = Uuid::new_v4();
    let slug = format!("{}-{}", slug_part(&name), &id.simple().to_string()[..8]);
    let mut transaction = pool.begin().await?;

    sqlx::query(
        "INSERT INTO worlds (id, slug, name, description, genre, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(id)
    .bind(&slug)
    .bind(name.trim())
    .bind(description.trim())
    .bind(genre.trim())
    .bind(account_id)
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        "INSERT INTO world_memberships (world_id, account_id, role)
         VALUES ($1, $2, 'owner')",
    )
    .bind(id)
    .bind(account_id)
    .execute(&mut *transaction)
    .await?;

    transaction.commit().await?;
    load_world(pool, id).await
}

async fn ensure_references_exist(
    connection: &mut PgConnection,
    world_id: Uuid,
    properties: &[CardPropertyInput],
) -> Result<(), ApiError> {
    for property in properties {
        if let CardPropertyInput::Reference { document_id, .. } = property {
            let exists = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS (
                    SELECT 1 FROM documents WHERE world_id = $1 AND id = $2
                 )",
            )
            .bind(world_id)
            .bind(document_id)
            .fetch_one(&mut *connection)
            .await?;

            if !exists {
                return Err(ApiError::bad_request("A card reference must target a document in the same world."));
            }
        }
    }

    Ok(())
}

async fn insert_properties(
    connection: &mut PgConnection,
    world_id: Uuid,
    document_id: Uuid,
    properties: &[CardPropertyInput],
) -> Result<(), ApiError> {
    for property in properties {
        match property {
            CardPropertyInput::Text { id, label, value } => {
                sqlx::query(
                    "INSERT INTO card_properties
                     (world_id, document_id, id, label, kind, text_value)
                     VALUES ($1, $2, $3, $4, 'text', $5)",
                )
                .bind(world_id)
                .bind(document_id)
                .bind(id)
                .bind(label.trim())
                .bind(value)
                .execute(&mut *connection)
                .await?;
            }
            CardPropertyInput::Reference { id, label, document_id: target_id } => {
                sqlx::query(
                    "INSERT INTO card_properties
                     (world_id, document_id, id, label, kind, reference_document_id)
                     VALUES ($1, $2, $3, $4, 'reference', $5)",
                )
                .bind(world_id)
                .bind(document_id)
                .bind(id)
                .bind(label.trim())
                .bind(target_id)
                .execute(&mut *connection)
                .await?;
            }
        }
    }

    Ok(())
}

async fn insert_blocks(
    connection: &mut PgConnection,
    world_id: Uuid,
    document_id: Uuid,
    blocks: &[CardBlockInput],
) -> Result<(), ApiError> {
    for (position, block) in blocks.iter().enumerate() {
        sqlx::query(
            "INSERT INTO card_blocks (world_id, document_id, id, position, text)
             VALUES ($1, $2, $3, $4, $5)",
        )
        .bind(world_id)
        .bind(document_id)
        .bind(&block.id)
        .bind(position as i32)
        .bind(&block.text)
        .execute(&mut *connection)
        .await?;
    }

    Ok(())
}

pub async fn list_documents(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
) -> Result<Vec<CardDocument>, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    load_documents(pool, world_id).await
}

pub async fn get_document(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    document_id: Uuid,
) -> Result<CardDocument, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    load_documents(pool, world_id)
        .await?
        .into_iter()
        .find(|document| document.id == document_id)
        .ok_or_else(ApiError::not_found)
}

pub async fn create_card(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    input: CardCreateInput,
) -> Result<CardDocument, ApiError> {
    validate_card_content(&input.name, &input.aliases, &input.properties, &input.blocks)?;
    let world_id = require_world(pool, account_id, slug, true).await?;
    let id = Uuid::new_v4();
    let document_slug = format!("{}-{}", slug_part(&input.name), &id.simple().to_string()[..8]);
    let aliases = input.aliases.iter().map(|value| value.trim().to_owned()).collect::<Vec<_>>();

    let mut transaction = pool.begin().await?;
    ensure_references_exist(&mut *transaction, world_id, &input.properties).await?;

    sqlx::query(
        "INSERT INTO documents
         (world_id, id, slug, document_type, entity_type, name, aliases, created_by)
         VALUES ($1, $2, $3, 'card', $4, $5, $6, $7)",
    )
    .bind(world_id)
    .bind(id)
    .bind(document_slug)
    .bind(input.entity_type.as_str())
    .bind(input.name.trim())
    .bind(aliases)
    .bind(account_id)
    .execute(&mut *transaction)
    .await?;

    insert_properties(&mut *transaction, world_id, id, &input.properties).await?;
    insert_blocks(&mut *transaction, world_id, id, &input.blocks).await?;
    sqlx::query("UPDATE worlds SET updated_at = NOW() WHERE id = $1")
        .bind(world_id)
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await?;
    get_document(pool, account_id, slug, id).await
}

pub async fn update_card(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    document_id: Uuid,
    input: CardUpdateInput,
) -> Result<CardDocument, ApiError> {
    validate_card_content(&input.name, &input.aliases, &input.properties, &input.blocks)?;
    if input.expected_version < 1 {
        return Err(ApiError::bad_request("expectedVersion must be a positive integer."));
    }

    let world_id = require_world(pool, account_id, slug, true).await?;
    let aliases = input.aliases.iter().map(|value| value.trim().to_owned()).collect::<Vec<_>>();
    let mut transaction: Transaction<'_, Postgres> = pool.begin().await?;

    let result = sqlx::query(
        "UPDATE documents
         SET name = $1, aliases = $2, version = version + 1, updated_at = NOW()
         WHERE world_id = $3 AND id = $4 AND version = $5",
    )
    .bind(input.name.trim())
    .bind(aliases)
    .bind(world_id)
    .bind(document_id)
    .bind(input.expected_version)
    .execute(&mut *transaction)
    .await?;

    if result.rows_affected() == 0 {
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS (SELECT 1 FROM documents WHERE world_id = $1 AND id = $2)",
        )
        .bind(world_id)
        .bind(document_id)
        .fetch_one(&mut *transaction)
        .await?;

        return if exists {
            Err(ApiError::conflict("This card changed since it was opened. Reload it before saving again."))
        } else {
            Err(ApiError::not_found())
        };
    }

    ensure_references_exist(&mut *transaction, world_id, &input.properties).await?;

    sqlx::query("DELETE FROM card_properties WHERE world_id = $1 AND document_id = $2")
        .bind(world_id)
        .bind(document_id)
        .execute(&mut *transaction)
        .await?;
    sqlx::query("DELETE FROM card_blocks WHERE world_id = $1 AND document_id = $2")
        .bind(world_id)
        .bind(document_id)
        .execute(&mut *transaction)
        .await?;

    insert_properties(&mut *transaction, world_id, document_id, &input.properties).await?;
    insert_blocks(&mut *transaction, world_id, document_id, &input.blocks).await?;
    sqlx::query("UPDATE worlds SET updated_at = NOW() WHERE id = $1")
        .bind(world_id)
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await?;
    get_document(pool, account_id, slug, document_id).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slug_part_is_stable_and_safe_for_routes() {
        assert_eq!(slug_part("The Shattered Meridian"), "the-shattered-meridian");
        assert_eq!(slug_part("  !!!  "), "world");
        assert_eq!(slug_part("North Quay 2"), "north-quay-2");
    }

    #[test]
    fn property_keys_are_constrained() {
        assert!(validate_key("founded_in"));
        assert!(validate_key("year-1"));
        assert!(!validate_key("Display Name"));
        assert!(!validate_key(""));
        assert!(!validate_key("UPPER"));
    }

    #[test]
    fn duplicate_aliases_are_rejected_case_insensitively() {
        let aliases = vec!["The Court".to_owned(), "the court".to_owned()];
        assert!(validate_aliases(&aliases).is_err());
    }

    #[test]
    fn document_content_limits_are_checked_before_database_writes() {
        let long_name = "x".repeat(121);
        assert!(validate_card_content(&long_name, &[], &[], &[]).is_err());

        let duplicate = vec![
            CardPropertyInput::Text { id: "age".into(), label: "Age".into(), value: "24".into() },
            CardPropertyInput::Text { id: "age".into(), label: "Age".into(), value: "25".into() },
        ];
        assert!(validate_card_content("Ari", &[], &duplicate, &[]).is_err());
    }
}
