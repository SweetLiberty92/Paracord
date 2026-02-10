use tokio::sync::broadcast;

#[derive(Debug, Clone)]
pub struct ServerEvent {
    pub event_type: String,
    pub payload: serde_json::Value,
    /// Guild ID this event belongs to, if applicable.
    pub guild_id: Option<i64>,
    /// When set, only deliver this event to the specified user IDs (e.g. DM recipients).
    pub target_user_ids: Option<Vec<i64>>,
}

/// Broadcast-based event bus for real-time dispatch.
#[derive(Clone)]
pub struct EventBus {
    sender: broadcast::Sender<ServerEvent>,
}

impl EventBus {
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    pub fn publish(&self, event: ServerEvent) {
        // Ignore error if no receivers
        let _ = self.sender.send(event);
    }

    pub fn subscribe(&self) -> broadcast::Receiver<ServerEvent> {
        self.sender.subscribe()
    }

    /// Helper: publish a typed event with guild_id
    pub fn dispatch(&self, event_type: &str, payload: serde_json::Value, guild_id: Option<i64>) {
        self.publish(ServerEvent {
            event_type: event_type.to_string(),
            payload,
            guild_id,
            target_user_ids: None,
        });
    }

    /// Helper: publish a targeted event delivered only to the specified users.
    pub fn dispatch_to_users(&self, event_type: &str, payload: serde_json::Value, target_user_ids: Vec<i64>) {
        self.publish(ServerEvent {
            event_type: event_type.to_string(),
            payload,
            guild_id: None,
            target_user_ids: Some(target_user_ids),
        });
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new(4096)
    }
}
