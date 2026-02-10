use crate::{DbError, DbPool};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct GuildRow {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub icon_hash: Option<String>,
    pub banner_hash: Option<String>,
    pub owner_id: i64,
    pub features: i32,
    pub system_channel_id: Option<i64>,
    pub vanity_url_code: Option<String>,
    pub created_at: DateTime<Utc>,
}

pub async fn create_guild(
    pool: &DbPool,
    id: i64,
    name: &str,
    owner_id: i64,
    icon_hash: Option<&str>,
) -> Result<GuildRow, DbError> {
    let row = sqlx::query_as::<_, GuildRow>(
        "INSERT INTO guilds (id, name, owner_id, icon_hash)
         VALUES (?1, ?2, ?3, ?4)
         RETURNING id, name, description, icon_hash, banner_hash, owner_id, features, system_channel_id, vanity_url_code, created_at"
    )
    .bind(id)
    .bind(name)
    .bind(owner_id)
    .bind(icon_hash)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

pub async fn get_guild(pool: &DbPool, id: i64) -> Result<Option<GuildRow>, DbError> {
    let row = sqlx::query_as::<_, GuildRow>(
        "SELECT id, name, description, icon_hash, banner_hash, owner_id, features, system_channel_id, vanity_url_code, created_at
         FROM guilds WHERE id = ?1"
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn update_guild(
    pool: &DbPool,
    id: i64,
    name: Option<&str>,
    description: Option<&str>,
    icon_hash: Option<&str>,
) -> Result<GuildRow, DbError> {
    let row = sqlx::query_as::<_, GuildRow>(
        "UPDATE guilds
         SET name = COALESCE(?2, name),
             description = COALESCE(?3, description),
             icon_hash = COALESCE(?4, icon_hash),
             updated_at = datetime('now')
         WHERE id = ?1
         RETURNING id, name, description, icon_hash, banner_hash, owner_id, features, system_channel_id, vanity_url_code, created_at"
    )
    .bind(id)
    .bind(name)
    .bind(description)
    .bind(icon_hash)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

pub async fn delete_guild(pool: &DbPool, id: i64) -> Result<(), DbError> {
    sqlx::query("DELETE FROM guilds WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_user_guilds(pool: &DbPool, user_id: i64) -> Result<Vec<GuildRow>, DbError> {
    let rows = sqlx::query_as::<_, GuildRow>(
        "SELECT g.id, g.name, g.description, g.icon_hash, g.banner_hash, g.owner_id, g.features, g.system_channel_id, g.vanity_url_code, g.created_at
         FROM guilds g
         INNER JOIN members m ON m.guild_id = g.id
         WHERE m.user_id = ?1
         ORDER BY g.created_at"
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn list_all_guilds(pool: &DbPool) -> Result<Vec<GuildRow>, DbError> {
    let rows = sqlx::query_as::<_, GuildRow>(
        "SELECT id, name, description, icon_hash, banner_hash, owner_id, features, system_channel_id, vanity_url_code, created_at
         FROM guilds
         ORDER BY created_at ASC"
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn count_guilds(pool: &DbPool) -> Result<i64, DbError> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM guilds")
        .fetch_one(pool)
        .await?;
    Ok(row.0)
}

pub async fn transfer_ownership(
    pool: &DbPool,
    guild_id: i64,
    new_owner_id: i64,
) -> Result<GuildRow, DbError> {
    let row = sqlx::query_as::<_, GuildRow>(
        "UPDATE guilds SET owner_id = ?2, updated_at = datetime('now')
         WHERE id = ?1
         RETURNING id, name, description, icon_hash, banner_hash, owner_id, features, system_channel_id, vanity_url_code, created_at"
    )
    .bind(guild_id)
    .bind(new_owner_id)
    .fetch_one(pool)
    .await?;
    Ok(row)
}
