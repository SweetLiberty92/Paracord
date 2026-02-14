use crate::{DbError, DbPool};
use chrono::{DateTime, Utc};
use std::collections::BTreeSet;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ChannelRow {
    pub id: i64,
    pub space_id: Option<i64>,
    pub name: Option<String>,
    pub topic: Option<String>,
    pub channel_type: i16,
    pub position: i32,
    pub parent_id: Option<i64>,
    pub nsfw: bool,
    pub rate_limit_per_user: i32,
    pub bitrate: Option<i32>,
    pub user_limit: Option<i32>,
    pub last_message_id: Option<i64>,
    pub required_role_ids: String,
    pub created_at: DateTime<Utc>,
}

impl ChannelRow {
    /// Backward compat: return space_id as guild_id
    pub fn guild_id(&self) -> Option<i64> {
        self.space_id
    }
}

pub async fn create_channel(
    pool: &DbPool,
    id: i64,
    space_id: i64,
    name: &str,
    channel_type: i16,
    position: i32,
    parent_id: Option<i64>,
    required_role_ids: Option<&str>,
) -> Result<ChannelRow, DbError> {
    let row = sqlx::query_as::<_, ChannelRow>(
        "INSERT INTO channels (id, space_id, name, channel_type, position, parent_id, required_role_ids)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, COALESCE(?7, '[]'))
         RETURNING id, space_id, name, topic, channel_type, position, parent_id, nsfw, rate_limit_per_user, bitrate, user_limit, last_message_id, required_role_ids, created_at"
    )
    .bind(id)
    .bind(space_id)
    .bind(name)
    .bind(channel_type)
    .bind(position)
    .bind(parent_id)
    .bind(required_role_ids)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

pub async fn get_channel(pool: &DbPool, id: i64) -> Result<Option<ChannelRow>, DbError> {
    let row = sqlx::query_as::<_, ChannelRow>(
        "SELECT id, space_id, name, topic, channel_type, position, parent_id, nsfw, rate_limit_per_user, bitrate, user_limit, last_message_id, required_role_ids, created_at
         FROM channels WHERE id = ?1"
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

/// Get channels for a space (alias kept as get_guild_channels for API compat).
pub async fn get_guild_channels(pool: &DbPool, space_id: i64) -> Result<Vec<ChannelRow>, DbError> {
    get_space_channels(pool, space_id).await
}

pub async fn get_space_channels(pool: &DbPool, space_id: i64) -> Result<Vec<ChannelRow>, DbError> {
    let rows = sqlx::query_as::<_, ChannelRow>(
        "SELECT id, space_id, name, topic, channel_type, position, parent_id, nsfw, rate_limit_per_user, bitrate, user_limit, last_message_id, required_role_ids, created_at
         FROM channels WHERE space_id = ?1 ORDER BY position"
    )
    .bind(space_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn update_channel(
    pool: &DbPool,
    id: i64,
    name: Option<&str>,
    topic: Option<&str>,
    required_role_ids: Option<&str>,
) -> Result<ChannelRow, DbError> {
    let row = sqlx::query_as::<_, ChannelRow>(
        "UPDATE channels
         SET name = COALESCE(?2, name),
             topic = COALESCE(?3, topic),
             required_role_ids = COALESCE(?4, required_role_ids),
             updated_at = datetime('now')
         WHERE id = ?1
         RETURNING id, space_id, name, topic, channel_type, position, parent_id, nsfw, rate_limit_per_user, bitrate, user_limit, last_message_id, required_role_ids, created_at"
    )
    .bind(id)
    .bind(name)
    .bind(topic)
    .bind(required_role_ids)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

pub async fn delete_channel(pool: &DbPool, id: i64) -> Result<(), DbError> {
    sqlx::query("DELETE FROM channels WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn count_channels(pool: &DbPool) -> Result<i64, DbError> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM channels")
        .fetch_one(pool)
        .await?;
    Ok(row.0)
}

pub async fn reorder_channels(
    pool: &DbPool,
    updates: &[(i64, i32)],
) -> Result<(), DbError> {
    for (channel_id, position) in updates {
        sqlx::query("UPDATE channels SET position = ?2, updated_at = datetime('now') WHERE id = ?1")
            .bind(channel_id)
            .bind(position)
            .execute(pool)
            .await?;
    }
    Ok(())
}

pub fn parse_required_role_ids(raw: &str) -> Vec<i64> {
    serde_json::from_str::<Vec<i64>>(raw).unwrap_or_default()
}

pub fn serialize_required_role_ids(role_ids: &[i64]) -> String {
    let unique_sorted: BTreeSet<i64> = role_ids.iter().copied().collect();
    let values: Vec<i64> = unique_sorted.into_iter().collect();
    serde_json::to_string(&values).unwrap_or_else(|_| "[]".to_string())
}
