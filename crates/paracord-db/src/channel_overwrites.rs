use crate::{DbError, DbPool};

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ChannelOverwriteRow {
    pub channel_id: i64,
    pub target_id: i64,
    pub target_type: i16,
    pub allow_perms: i64,
    pub deny_perms: i64,
}

pub async fn get_channel_overwrites(
    pool: &DbPool,
    channel_id: i64,
) -> Result<Vec<ChannelOverwriteRow>, DbError> {
    let rows = sqlx::query_as::<_, ChannelOverwriteRow>(
        "SELECT channel_id, target_id, target_type, allow_perms, deny_perms
         FROM channel_overwrites
         WHERE channel_id = ?1",
    )
    .bind(channel_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn upsert_channel_overwrite(
    pool: &DbPool,
    channel_id: i64,
    target_id: i64,
    target_type: i16,
    allow_perms: i64,
    deny_perms: i64,
) -> Result<(), DbError> {
    sqlx::query(
        "INSERT INTO channel_overwrites (channel_id, target_id, target_type, allow_perms, deny_perms)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT (channel_id, target_id) DO UPDATE
         SET target_type = EXCLUDED.target_type,
             allow_perms = EXCLUDED.allow_perms,
             deny_perms = EXCLUDED.deny_perms",
    )
    .bind(channel_id)
    .bind(target_id)
    .bind(target_type)
    .bind(allow_perms)
    .bind(deny_perms)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn delete_channel_overwrite(
    pool: &DbPool,
    channel_id: i64,
    target_id: i64,
) -> Result<(), DbError> {
    sqlx::query(
        "DELETE FROM channel_overwrites
         WHERE channel_id = ?1 AND target_id = ?2",
    )
    .bind(channel_id)
    .bind(target_id)
    .execute(pool)
    .await?;
    Ok(())
}
