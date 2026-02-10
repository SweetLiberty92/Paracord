use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

/// Custom epoch: 2024-01-01T00:00:00Z
const PARACORD_EPOCH: u64 = 1_704_067_200_000;

static SEQUENCE: AtomicU64 = AtomicU64::new(0);

/// Generate a Snowflake ID.
/// Format: 42 bits timestamp | 10 bits worker | 12 bits sequence
pub fn generate(worker_id: u16) -> i64 {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("time went backwards")
        .as_millis() as u64;
    let timestamp = now - PARACORD_EPOCH;
    let seq = SEQUENCE.fetch_add(1, Ordering::Relaxed) & 0xFFF;
    let id = (timestamp << 22) | ((worker_id as u64 & 0x3FF) << 12) | seq;
    id as i64
}

/// Extract the Unix timestamp (ms) from a snowflake.
pub fn timestamp_millis(id: i64) -> u64 {
    ((id as u64) >> 22) + PARACORD_EPOCH
}
