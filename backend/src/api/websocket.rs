// backend/src/api/websocket.rs
use axum::{
    extract::{
        ws::{WebSocketUpgrade, WebSocket},
        State,
        Query,
    },
    response::Response,
    routing::get,
    Router,
};
use std::collections::HashMap;
use serde::Deserialize;

use crate::{
    models::{
        websocket::{SubscriptionTopic, WsMessage},
        ApiError, ApiResult,
    },
    AppState,
};

/// Query parameters for WebSocket upgrade
#[derive(Debug, Deserialize)]
pub struct WsQuery {
    /// Client can specify topics to subscribe to
    pub topics: Option<String>, // Comma-separated list
    /// Client metadata
    pub client_id: Option<String>,
}

/// Create WebSocket router
pub fn websocket_routes() -> Router<AppState> {
    Router::new()
        .route("/ws", get(websocket_handler))
        .route("/ws/broadcast", get(broadcast_test_handler))
        .route("/ws/stats", get(websocket_stats_handler))
}

/// Handle WebSocket upgrade requests
// Updated 
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(params): Query<WsQuery>,  // Make params mutable
) -> Result<Response, ApiError> {
    // Clone topics before moving params into closure
    let topics_clone = params.topics.clone().unwrap_or_default();
    
    // Parse subscription topics from the clone
    let topics: Vec<SubscriptionTopic> = topics_clone
        .split(',')
        .filter(|s| !s.is_empty())
        .map(|s| s.trim().into())
        .collect();

    // Log connection attempt
    tracing::info!(
        "WebSocket upgrade request - Client: {:?}, Topics: {:?}",
        params.client_id,
        topics
    );

    // Upgrade the connection
    Ok(ws.on_upgrade(move |socket| {
        handle_websocket(socket, state, topics, params)  // Now params can be moved
    }))
}
/// Handle the actual WebSocket connection
async fn handle_websocket(
    socket: WebSocket,
    state: AppState,
    _topics: Vec<SubscriptionTopic>,
    _params: WsQuery,
) {
    if let Err(e) = state.websocket_service.handle_connection(socket).await {
        tracing::error!("WebSocket connection failed: {}", e);
    }
}

/// Test endpoint to broadcast messages (useful for development/testing)
pub async fn broadcast_test_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> ApiResult<&'static str> {
    let message = params.get("message")
        .unwrap_or(&"Test broadcast message".to_string())
        .clone();
    
    let topic = params.get("topic")
        .map(|t| t.as_str().into())
        .unwrap_or(SubscriptionTopic::All);

    let ws_message = WsMessage::Custom {
        event: "test_broadcast".to_string(),
        data: serde_json::json!({ "message": message }),
    };

    state.websocket_service
        .broadcast_to_topic(topic, ws_message)
        .await
        .map_err(|e| {
            tracing::error!("Failed to broadcast test message: {}", e);
            e
        })?;

    Ok("Message broadcasted successfully")
}

/// Get WebSocket connection statistics
pub async fn websocket_stats_handler(
    State(state): State<AppState>,
) -> ApiResult<axum::Json<serde_json::Value>> {
    let connections = state.websocket_service.get_connections().await;
    let connection_count = state.websocket_service.connection_count();

    let stats = serde_json::json!({
        "total_connections": connection_count,
        "active_connections": connections.len(),
        "connections": connections.values().collect::<Vec<_>>()
    });

    Ok(axum::Json(stats))
}


