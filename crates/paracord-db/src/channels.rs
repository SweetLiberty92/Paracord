use crate::{DbError, DbPool};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ChannelRow {
    pub id: i64,
    pub guild_id: Option<i64>,
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
    pub created_at: DateTime<Utc>,
}

pub async fn create_channel(
    pool: &DbPool,
    id: i64,
    guild_id: i64,
    name: &str,
    channel_type: i16,
    position: i32,
    parent_id: Option<i64>,
) -> Result<ChannelRow, DbError> {
    let row = sqlx::query_as::<_, ChannelRow>(
        "INSERT INTO channels (id, guild_id, name, channel_type, position, parent_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         RETURNING id, guild_id, name, topic, channel_type, position, parent_id, nsfw, rate_limit_per_user, bitrate, user_limit, last_message_id, created_at"
    )
    .bind(id)
    .bind(guild_id)
    .bind(name)
    .bind(channel_type)
    .bind(position)
    .bind(parent_id)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

pub async fn get_channel(pool: &DbPool, id: i64) -> Result<Option<ChannelRow>, DbError> {
    let row = sqlx::query_as::<_, ChannelRow>(
        "SELECT id, guild_id, name, topic, channel_type, position, parent_id, nsfw, rate_limit_per_user, bitrate, user_limit, last_message_id, created_at
         FROM channels WHERE id = ?1"
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn get_guild_channels(pool: &DbPool, guild_id: i64) -> Result<Vec<ChannelRow>, DbError> {
    let rows = sqlx::query_as::<_, ChannelRow>(
        "SELECT id, guild_id, name, topic, channel_type, position, parent_id, nsfw, rate_limit_per_user, bitrate, user_limit, last_message_id, created_at
         FROM channels WHERE guild_id = ?1 ORDER BY position"
    )
    .bind(guild_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn update_channel(
    pool: &DbPool,
    id: i64,
    name: Option<&str>,
    topic: Option<&str>,
) -> Result<ChannelRow, DbError> {
    let row = sqlx::query_as::<_, ChannelRow>(
        "UPDATE channels SET name = COALESCE(?2, name), topic = COALESCE(?3, topic), updated_at = datetime('now')
         WHERE id = ?1
         RETURNING id, guild_id, name, topic, channel_type, position, parent_id, nsfw, rate_limit_per_user, bitrate, user_limit, last_message_id, created_at"
    )
    .bind(id)
    .bind(name)
    .bind(topic)
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
