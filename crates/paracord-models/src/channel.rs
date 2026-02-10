use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[repr(i16)]
pub enum ChannelType {
    Text = 0,
    DM = 1,
    Voice = 2,
    GroupDM = 3,
    Category = 4,
    Announcement = 5,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub id: i64,
    pub channel_type: ChannelType,
    pub guild_id: Option<i64>,
    pub name: Option<String>,
    pub topic: Option<String>,
    pub position: i32,
    pub nsfw: bool,
    pub bitrate: Option<i32>,
    pub user_limit: Option<i32>,
    pub rate_limit_per_user: Option<i32>,
    pub parent_id: Option<i64>,
    pub last_message_id: Option<i64>,
    pub created_at: DateTime<Utc>,
}
