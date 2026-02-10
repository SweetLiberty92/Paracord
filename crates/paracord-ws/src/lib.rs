mod handler;
mod session;

use axum::{
    extract::{ws::WebSocketUpgrade, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use paracord_core::AppState;

pub fn gateway_router() -> Router<AppState> {
    Router::new().route("/gateway", get(ws_upgrade))
}

async fn ws_upgrade(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handler::handle_connection(socket, state))
}
