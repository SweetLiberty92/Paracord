use crate::{DbError, DbPool};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct BanRow {
    pub user_id: i64,
    pub guild_id: i64,
    pub reason: Option<String>,
    pub banned_by: Option<i64>,
    pub created_at: DateTime<Utc>,
}

pub async fn create_ban(
    pool: &DbPool,
    user_id: i64,
    guild_id: i64,
    reason: Option<&str>,
    banned_by: i64,
) -> Result<BanRow, DbError> {
    let row = sqlx::query_as::<_, BanRow>(
        "INSERT INTO bans (user_id, guild_id, reason, banned_by)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (user_id, guild_id) DO UPDATE SET reason = ?3, banned_by = ?4, created_at = datetime('now')
         RETURNING user_id, guild_id, reason, banned_by, created_at"
    )
    .bind(user_id)
    .bind(guild_id)
    .bind(reason)
    .bind(banned_by)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

pub async fn get_ban(pool: &DbPool, user_id: i64, guild_id: i64) -> Result<Option<BanRow>, DbError> {
    let row = sqlx::query_as::<_, BanRow>(
        "SELECT user_id, guild_id, reason, banned_by, created_at
         FROM bans WHERE user_id = ?1 AND guild_id = ?2"
    )
    .bind(user_id)
    .bind(guild_id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn delete_ban(pool: &DbPool, user_id: i64, guild_id: i64) -> Result<(), DbError> {
    sqlx::query("DELETE FROM bans WHERE user_id = ?1 AND guild_id = ?2")
        .bind(user_id)
        .bind(guild_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_guild_bans(pool: &DbPool, guild_id: i64) -> Result<Vec<BanRow>, DbError> {
    let rows = sqlx::query_as::<_, BanRow>(
        "SELECT user_id, guild_id, reason, banned_by, created_at
         FROM bans WHERE guild_id = ?1 ORDER BY created_at DESC"
    )
    .bind(guild_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}
