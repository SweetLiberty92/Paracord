pub mod users;
pub mod guilds;
pub mod channels;
pub mod channel_overwrites;
pub mod messages;
pub mod members;
pub mod roles;
pub mod invites;
pub mod relationships;
pub mod dms;
pub mod voice_states;
pub mod bans;
pub mod audit_log;
pub mod attachments;
pub mod reactions;
pub mod read_states;
pub mod emojis;
pub mod server_settings;

use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use std::str::FromStr;
use thiserror::Error;

pub type DbPool = sqlx::SqlitePool;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("database error: {0}")]
    Sqlx(#[from] sqlx::Error),
    #[error("not found")]
    NotFound,
}

pub async fn create_pool(database_url: &str, max_connections: u32) -> Result<DbPool, sqlx::Error> {
    let options = SqliteConnectOptions::from_str(database_url)?
        .journal_mode(SqliteJournalMode::Wal)
        .create_if_missing(true)
        .foreign_keys(true);

    SqlitePoolOptions::new()
        .max_connections(max_connections)
        .connect_with(options)
        .await
}

pub async fn run_migrations(pool: &DbPool) -> Result<(), sqlx::Error> {
    sqlx::migrate!("./migrations").run(pool).await?;
    tracing::info!("migrations: applied successfully");
    Ok(())
}
