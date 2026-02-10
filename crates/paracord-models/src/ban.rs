use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ban {
    pub user_id: i64,
    pub guild_id: i64,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
}
