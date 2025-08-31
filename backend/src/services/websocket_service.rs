// backend/src/services/websocket_service.rs

//! # WebSocket Service
//!
//! ## Description
//! A comprehensive WebSocket service for managing real-time connections, message broadcasting,
//! and subscription-based communication. This service handles multiple concurrent connections,
//! provides topic-based message routing, and includes robust connection management with
//! automatic cleanup and health monitoring.
//!
//! ## Dependencies
//! - `axum::extract::ws` - WebSocket extraction and handling
//! - `futures_util` - Stream and sink utilities for async WebSocket operations
//! - `tokio::sync` - Async synchronization primitives (RwLock, broadcast channels)
//! - `serde_json` - JSON serialization/deserialization for messages
//! - `chrono` - Date/time handling for connection timestamps
//! - `tracing` - Structured logging and debugging
//! - `uuid` - Unique connection identifier generation
//!
//! ## How to Use
//! 1. Create a new service instance: `WebSocketService::new(Some(config))`
//! 2. Start background tasks: `service.start_background_tasks().await`
//! 3. Handle incoming connections: `service.handle_connection(socket).await`
//! 4. Broadcast messages: `service.broadcast_to_topic(topic, message).await`
//!
//! ## Connection Flow
//! 1. Client connects → `handle_connection()` validates and registers connection
//! 2. Welcome message sent → Client receives connection confirmation
//! 3. Message loop starts → Bidirectional communication begins
//! 4. Cleanup on disconnect → Connection removed from registry
//!
//! ## Debugging Features
//! - Comprehensive logging at all levels (trace, debug, info, warn, error)
//! - Connection state tracking and reporting
//! - Message flow monitoring
//! - Performance metrics and timing
//! - Error context and stack traces

use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::Instant,
};
use tokio::sync::{broadcast, RwLock};
use tracing::{debug, error, info, warn, trace, instrument, Span};

use crate::models::{
    websocket::{ConnectionId, ConnectionInfo, SubscriptionTopic, WsConfig, WsMessage},
    ApiError,
};

// ═══════════════════════════════════════════════════════════════════════════════════
// WEBSOCKET SERVICE STRUCT
// ═══════════════════════════════════════════════════════════════════════════════════
// Main service struct that manages all WebSocket connections and provides broadcasting
// capabilities. Uses Arc<RwLock> for thread-safe connection management and broadcast
// channels for efficient message distribution.

/// WebSocket connection manager that handles multiple connections and message broadcasting
#[derive(Clone, Debug)]
pub struct WebSocketService {
    /// Thread-safe registry of active connections
    connections: Arc<RwLock<HashMap<ConnectionId, ConnectionInfo>>>,
    /// Broadcast channel for distributing messages to all subscribers
    broadcaster: broadcast::Sender<(SubscriptionTopic, WsMessage)>,
    /// Atomic counter for tracking active connections
    connection_count: Arc<AtomicUsize>,
    /// Service configuration parameters
    config: WsConfig,
}

// ═══════════════════════════════════════════════════════════════════════════════════
// SERVICE INITIALIZATION AND CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════
// Functions for creating and configuring the WebSocket service instance.

impl WebSocketService {
    /// Create a new WebSocket service instance with enhanced debugging
    #[instrument(name = "websocket_service_new", level = "info")]
    pub fn new(config: Option<WsConfig>) -> Self {
        let config = config.unwrap_or_default();
        let (tx, _rx) = broadcast::channel(config.buffer_size.unwrap_or(1000));
        
        info!(
            max_connections = config.max_connections,
            ping_interval = ?config.ping_interval,
            connection_timeout = ?config.connection_timeout,
            "Initializing WebSocket service"
        );
        
        let service = Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            broadcaster: tx,
            connection_count: Arc::new(AtomicUsize::new(0)),
            config,
        };

        // Log service readiness
        info!("WebSocket service initialized successfully");
        service
    }

    /// Get current connection count with detailed logging
    #[instrument(name = "get_connection_count", level = "trace")]
    pub fn connection_count(&self) -> usize {
        let count = self.connection_count.load(Ordering::Relaxed);
        trace!(connection_count = count, "Retrieved current connection count");
        count
    }

    /// Get all active connections with debugging info
    #[instrument(name = "get_connections", level = "debug")]
    pub async fn get_connections(&self) -> HashMap<ConnectionId, ConnectionInfo> {
        let start = Instant::now();
        let connections = self.connections.read().await.clone();
        let duration = start.elapsed();
        
        debug!(
            connection_count = connections.len(),
            read_duration_ms = duration.as_millis(),
            "Retrieved all connections"
        );
        
        connections
    }

    /// Get detailed service statistics for debugging
    #[instrument(name = "get_service_stats", level = "debug")]
    pub async fn get_service_stats(&self) -> ServiceStats {
        let connections = self.connections.read().await;
        let total_connections = connections.len();
        let subscriber_count = self.broadcaster.receiver_count();
        
        let mut topic_counts = HashMap::new();
        for conn in connections.values() {
            for subscription in &conn.subscriptions {
                *topic_counts.entry(subscription.clone()).or_insert(0) += 1;
            }
        }

        let stats = ServiceStats {
            total_connections,
            subscriber_count,
            topic_subscriptions: topic_counts,
            uptime: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default(),
        };

        debug!(?stats, "Generated service statistics");
        stats
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════════
// Core functions for handling WebSocket connection lifecycle: establishment, management,
// and cleanup. Includes comprehensive error handling and logging.

impl WebSocketService {
    /// Handle a new WebSocket connection with extensive debugging
    #[instrument(name = "handle_connection", level = "info", fields(connection_id))]
    pub async fn handle_connection(&self, socket: WebSocket) -> Result<(), ApiError> {
        let start_time = Instant::now();
        let current_count = self.connection_count.fetch_add(1, Ordering::Relaxed);
        
        // Prevent connection flooding
        if current_count >= 50 { // Reasonable limit
            error!("Connection rejected: Too many connections ({})", current_count);
            return Err(ApiError::WebSocketError("Too many connections".to_string()));
        }

        info!(
            current_connections = current_count + 1,
            max_connections = self.config.max_connections,
            "Processing new WebSocket connection request"
        );

        // Check connection limits
        if current_count >= self.config.max_connections {
            self.connection_count.fetch_sub(1, Ordering::Relaxed);
            error!(
                current_connections = current_count,
                max_connections = self.config.max_connections,
                "Connection rejected: Maximum connections reached"
            );
            return Err(ApiError::WebSocketError(
                "Maximum connections reached".to_string()
            ));
        }

        let connection_info = ConnectionInfo::new();
        let connection_id = connection_info.id;
        
        // Update the span with the connection ID
        Span::current().record("connection_id", &tracing::field::display(connection_id));
        
        info!(
            connection_id = %connection_id,
            connection_time = ?connection_info.connected_at,
            setup_duration_ms = start_time.elapsed().as_millis(),
            "New WebSocket connection established"
        );

        // Add connection to the registry with error handling
        {
            let mut connections = self.connections.write().await;
            connections.insert(connection_id, connection_info);
            debug!(
                connection_id = %connection_id,
                total_connections = connections.len(),
                "Connection registered successfully"
            );
        }

        // Handle the connection in a separate task with comprehensive error logging
        let service = self.clone();
        tokio::spawn(async move {
            let span = tracing::info_span!("connection_handler", connection_id = %connection_id);
            let _enter = span.enter();
            
            info!("Starting connection handler task");
            
            match service.handle_socket(socket, connection_id).await {
                Ok(()) => {
                    info!("Connection handler completed successfully");
                }
                Err(e) => {
                    error!(
                        error = %e,
                        error_debug = ?e,
                        "WebSocket connection error occurred"
                    );
                }
            }
            
            // Cleanup on disconnect
            info!("Beginning connection cleanup");
            service.cleanup_connection(connection_id).await;
            info!("Connection cleanup completed");
        });

        debug!(
            connection_id = %connection_id,
            total_setup_time_ms = start_time.elapsed().as_millis(),
            "Connection handling task spawned successfully"
        );

        Ok(())
    }

    /// Handle individual socket communication with detailed message tracking
    #[instrument(name = "handle_socket", level = "debug", fields(connection_id = %connection_id))]
    async fn handle_socket(
        &self,
        socket: WebSocket,
        connection_id: ConnectionId,
    ) -> Result<(), ApiError> {
        info!("Starting socket handler for connection");
        
        let (mut sender, mut receiver) = socket.split();
        let mut message_count = 0u64;
        let start_time = Instant::now();
        
        debug!("WebSocket split into sender and receiver successfully");

        // Send connection established message with error handling
        let welcome_msg = WsMessage::ConnectionEstablished { connection_id };
        let welcome_json = serde_json::to_string(&welcome_msg)
            .map_err(|e| {
                error!(
                    error = %e,
                    message_type = "ConnectionEstablished",
                    "Failed to serialize welcome message"
                );
                ApiError::SerializationError(e.to_string())
            })?;

        debug!(
            message = %welcome_json,
            "Sending welcome message to client"
        );

        if let Err(e) = sender.send(Message::Text(welcome_json)).await {
            error!(
                error = %e,
                "Failed to send welcome message - connection may be broken"
            );
            return Err(ApiError::WebSocketError(format!("Failed to send welcome: {}", e)));
        }

        info!("Welcome message sent successfully");

        // Subscribe to broadcast messages
        let mut broadcast_rx = self.broadcaster.subscribe();
        debug!("Subscribed to broadcast channel");
        
        // Handle incoming and outgoing messages concurrently
        let _connections = Arc::clone(&self.connections);
        
        info!("Starting message processing loop");
        
        loop {
            tokio::select! {
                // Handle incoming messages from client
                msg = receiver.next() => {
                    trace!("Received message from client");
                    
                    match msg {
                        Some(Ok(Message::Text(text))) => {
                            message_count += 1;
                            debug!(
                                message_count,
                                message_length = text.len(),
                                message_preview = &text[..text.len().min(100)],
                                "Processing text message from client"
                            );
                            
                            if let Err(e) = self.handle_incoming_message(&text, connection_id).await {
                                warn!(
                                    error = %e,
                                    message_text = %text,
                                    "Error handling incoming message"
                                );
                            } else {
                                trace!("Successfully processed incoming message");
                            }
                        }
                        Some(Ok(Message::Ping(data))) => {
                            debug!(
                                ping_data_len = data.len(),
                                "Received ping, sending pong response"
                            );
                            
                            if let Err(e) = sender.send(Message::Pong(data)).await {
                                error!(error = %e, "Failed to send pong response");
                                break;
                            }
                            
                            self.update_last_ping(connection_id).await;
                            trace!("Pong sent and last ping updated");
                        }
                        Some(Ok(Message::Close(close_frame))) => {
                            info!(
                                close_code = ?close_frame.as_ref().map(|f| f.code),
                                close_reason = ?close_frame.as_ref().map(|f| &f.reason),
                                message_count,
                                session_duration_ms = start_time.elapsed().as_millis(),
                                "WebSocket connection closed by client"
                            );
                            break;
                        }
                        Some(Ok(Message::Pong(_))) => {
                            debug!("Received pong from client");
                            self.update_last_ping(connection_id).await;
                        }
                        Some(Ok(Message::Binary(data))) => {
                            debug!(
                                binary_length = data.len(),
                                "Received binary message from client"
                            );
                            // Handle binary messages if needed
                        }
                        Some(Err(e)) => {
                            error!(
                                error = %e,
                                error_debug = ?e,
                                message_count,
                                session_duration_ms = start_time.elapsed().as_millis(),
                                "WebSocket error occurred"
                            );
                            break;
                        }
                        None => {
                            warn!(
                                message_count,
                                session_duration_ms = start_time.elapsed().as_millis(),
                                "WebSocket stream ended (client disconnected)"
                            );
                            break;
                        }
                    }
                }
                
                // Handle broadcast messages to send to client
                broadcast_msg = broadcast_rx.recv() => {
                    trace!("Received broadcast message");
                    
                    match broadcast_msg {
                        Ok((topic, message)) => {
                            trace!(
                                topic = %topic.to_string(),
                                message_type = ?std::mem::discriminant(&message),
                                "Processing broadcast message"
                            );
                            
                            if self.should_send_to_connection(&topic, connection_id).await {
                                let msg_text = serde_json::to_string(&message)
                                    .map_err(|e| {
                                        error!(
                                            error = %e,
                                            topic = %topic.to_string(),
                                            "Failed to serialize broadcast message"
                                        );
                                        ApiError::SerializationError(e.to_string())
                                    })?;
                                
                                debug!(
                                    topic = %topic.to_string(),
                                    message_length = msg_text.len(),
                                    "Sending broadcast message to client"
                                );
                                
                                if let Err(e) = sender.send(Message::Text(msg_text)).await {
                                    error!(
                                        error = %e,
                                        topic = %topic.to_string(),
                                        "Failed to send broadcast message - connection lost"
                                    );
                                    break; // Connection lost
                                }
                                
                                trace!("Broadcast message sent successfully");
                            } else {
                                trace!(
                                    topic = %topic.to_string(),
                                    "Skipping broadcast - connection not subscribed to topic"
                                );
                            }
                        }
                        Err(broadcast::error::RecvError::Lagged(skipped)) => {
                            warn!(
                                skipped_messages = skipped,
                                "Broadcast receiver lagged - some messages may have been lost"
                            );
                        }
                        Err(broadcast::error::RecvError::Closed) => {
                            info!("Broadcast channel closed - ending message loop");
                            break;
                        }
                    }
                }
            }
        }

        info!(
            total_messages_processed = message_count,
            total_session_duration_ms = start_time.elapsed().as_millis(),
            "Socket handler completed"
        );

        Ok(())
    }

    /// Clean up a disconnected connection with detailed logging
    #[instrument(name = "cleanup_connection", level = "info", fields(connection_id = %connection_id))]
    async fn cleanup_connection(&self, connection_id: ConnectionId) {
        let start_time = Instant::now();
        
        debug!("Starting connection cleanup process");
        
        let connection_info = {
            let mut connections = self.connections.write().await;
            let removed = connections.remove(&connection_id);
            
            debug!(
                remaining_connections = connections.len(),
                connection_existed = removed.is_some(),
                "Connection removed from registry"
            );
            
            removed
        };
        
        let previous_count = self.connection_count.fetch_sub(1, Ordering::Relaxed);
        let new_count = previous_count.saturating_sub(1);
        
        if let Some(info) = connection_info {
            let session_duration = chrono::Utc::now() - info.connected_at;
            info!(
                session_duration_seconds = session_duration.num_seconds(),
                subscriptions = ?info.subscriptions,
                last_ping = ?info.last_ping,
                previous_count,
                new_count,
                cleanup_duration_ms = start_time.elapsed().as_millis(),
                "WebSocket connection cleaned up successfully"
            );
        } else {
            warn!(
                previous_count,
                new_count,
                "Attempted to cleanup non-existent connection"
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLING AND PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════════
// Functions for processing incoming messages from clients and handling different
// message types with appropriate responses and error handling.

impl WebSocketService {
    /// Handle incoming messages from clients with comprehensive logging
    #[instrument(
        name = "handle_incoming_message", 
        level = "debug",
        fields(
            connection_id = %connection_id,
            message_length = text.len()
        )
    )]
    async fn handle_incoming_message(
        &self,
        text: &str,
        connection_id: ConnectionId,
    ) -> Result<(), ApiError> {
        let parse_start = Instant::now();
        
        debug!(
            message_preview = &text[..text.len().min(200)],
            "Parsing incoming message"
        );

        let message: WsMessage = serde_json::from_str(text)
            .map_err(|e| {
                error!(
                    error = %e,
                    raw_message = %text,
                    parse_duration_ms = parse_start.elapsed().as_millis(),
                    "Failed to deserialize incoming message"
                );
                ApiError::DeserializationError(e.to_string())
            })?;

        debug!(
            message_type = ?std::mem::discriminant(&message),
            parse_duration_ms = parse_start.elapsed().as_millis(),
            "Message parsed successfully"
        );

        let process_start = Instant::now();

        match message {
            WsMessage::Ping => {
                debug!("Processing ping message");
                if let Err(e) = self.send_to_connection(connection_id, WsMessage::Pong).await {
                    error!(error = %e, "Failed to respond to ping");
                    return Err(e);
                }
                info!("Ping processed and pong sent");
            }
            WsMessage::Subscribe { topics } => {
                info!(topics = ?topics, "Processing subscription request");
                if let Err(e) = self.handle_subscription(connection_id, topics).await {
                    error!(error = %e, "Failed to process subscription");
                    return Err(e);
                }
                info!("Subscription processed successfully");
            }
            WsMessage::Unsubscribe { topics } => {
                info!(topics = ?topics, "Processing unsubscription request");
                if let Err(e) = self.handle_unsubscription(connection_id, topics).await {
                    error!(error = %e, "Failed to process unsubscription");
                    return Err(e);
                }
                info!("Unsubscription processed successfully");
            }
            WsMessage::Custom { event, data } => {
                info!(
                    event = %event,
                    data_size = data.to_string().len(),
                    "Processing custom event"
                );
                debug!("Custom event data: {:?}", data);
                // Handle custom events here - add your business logic
            }
            _ => {
                debug!(message = ?message, "Received other message type");
            }
        }

        debug!(
            processing_duration_ms = process_start.elapsed().as_millis(),
            total_duration_ms = parse_start.elapsed().as_millis(),
            "Message processing completed"
        );

        Ok(())
    }

    /// Handle subscription requests with validation and logging
    #[instrument(name = "handle_subscription", level = "debug")]
    async fn handle_subscription(
        &self,
        connection_id: ConnectionId,
        topics: Vec<String>,
    ) -> Result<(), ApiError> {
        let mut connections = self.connections.write().await;
        
        if let Some(connection) = connections.get_mut(&connection_id) {
            let before_count = connection.subscriptions.len();
            
            for topic in &topics {
                if !connection.subscriptions.contains(topic) {
                    connection.subscriptions.push(topic.clone());
                    debug!(topic = %topic, "Added subscription");
                } else {
                    debug!(topic = %topic, "Already subscribed to topic");
                }
            }
            
            let after_count = connection.subscriptions.len();
            info!(
                topics = ?topics,
                subscriptions_before = before_count,
                subscriptions_after = after_count,
                new_subscriptions = after_count - before_count,
                "Subscription update completed"
            );
        } else {
            error!("Attempted to subscribe non-existent connection");
            return Err(ApiError::WebSocketError("Connection not found".to_string()));
        }

        Ok(())
    }

    /// Handle unsubscription requests with validation and logging
    #[instrument(name = "handle_unsubscription", level = "debug")]
    async fn handle_unsubscription(
        &self,
        connection_id: ConnectionId,
        topics: Vec<String>,
    ) -> Result<(), ApiError> {
        let mut connections = self.connections.write().await;
        
        if let Some(connection) = connections.get_mut(&connection_id) {
            let before_count = connection.subscriptions.len();
            
            for topic in &topics {
                if let Some(pos) = connection.subscriptions.iter().position(|x| x == topic) {
                    connection.subscriptions.remove(pos);
                    debug!(topic = %topic, "Removed subscription");
                } else {
                    debug!(topic = %topic, "Was not subscribed to topic");
                }
            }
            
            let after_count = connection.subscriptions.len();
            info!(
                topics = ?topics,
                subscriptions_before = before_count,
                subscriptions_after = after_count,
                removed_subscriptions = before_count - after_count,
                "Unsubscription update completed"
            );
        } else {
            error!("Attempted to unsubscribe non-existent connection");
            return Err(ApiError::WebSocketError("Connection not found".to_string()));
        }

        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// MESSAGE BROADCASTING AND DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════════════
// Functions for sending messages to specific connections and broadcasting to multiple
// subscribers based on topic subscriptions.

impl WebSocketService {
    /// Send a message to a specific connection with detailed error tracking
    #[instrument(
        name = "send_to_connection", 
        level = "debug",
        fields(connection_id = %connection_id)
    )]
    pub async fn send_to_connection(
        &self,
        connection_id: ConnectionId,
        message: WsMessage,
    ) -> Result<(), ApiError> {
        debug!(
            message_type = ?std::mem::discriminant(&message),
            "Sending direct message to connection"
        );

        // Check if connection exists before sending
        {
            let connections = self.connections.read().await;
            if !connections.contains_key(&connection_id) {
                error!("Attempted to send message to non-existent connection");
                return Err(ApiError::WebSocketError("Connection not found".to_string()));
            }
        }

        // For direct sends, we broadcast with a special topic that only the target receives
        let send_result = self.broadcaster
            .send((SubscriptionTopic::Direct(connection_id), message));

        match send_result {
            Ok(subscriber_count) => {
                debug!(
                    subscriber_count,
                    "Message sent successfully to broadcast channel"
                );
                Ok(())
            }
            Err(e) => {
                error!(
                    error = %e,
                    "Failed to send message to broadcast channel"
                );
                Err(ApiError::WebSocketError(format!("Failed to send message: {}", e)))
            }
        }
    }

    /// Broadcast a message to all connections subscribed to a topic
    #[instrument(
        name = "broadcast_to_topic", 
        level = "info",
        fields(topic = %topic.to_string())
    )]
    pub async fn broadcast_to_topic(
        &self,
        topic: SubscriptionTopic,
        message: WsMessage,
    ) -> Result<(), ApiError> {
        let broadcast_start = Instant::now();
        let subscriber_count = self.broadcaster.receiver_count();
        
        info!(
            subscriber_count,
            message_type = ?std::mem::discriminant(&message),
            "Broadcasting message to topic subscribers"
        );

        // Count eligible connections for this topic
        let eligible_connections = {
            let connections = self.connections.read().await;
            let count = connections.values()
                .filter(|conn| {
                    conn.subscriptions.contains(&"all".to_string()) ||
                    conn.subscriptions.contains(&topic.to_string())
                })
                .count();
            count
        };

        debug!(
            eligible_connections,
            total_connections = self.connection_count(),
            "Calculated eligible connections for broadcast"
        );

        let send_result = self.broadcaster.send((topic.clone(), message));

        match send_result {
            Ok(receiver_count) => {
                info!(
                    topic = %topic.to_string(),
                    receiver_count,
                    eligible_connections,
                    broadcast_duration_ms = broadcast_start.elapsed().as_millis(),
                    "Broadcast completed successfully"
                );
                Ok(())
            }
            Err(e) => {
                error!(
                    topic = %topic.to_string(),
                    error = %e,
                    broadcast_duration_ms = broadcast_start.elapsed().as_millis(),
                    "Failed to broadcast message"
                );
                Err(ApiError::WebSocketError(format!("Failed to broadcast: {}", e)))
            }
        }
    }

    /// Broadcast to all connections with enhanced logging
    #[instrument(name = "broadcast_to_all", level = "info")]
    pub async fn broadcast_to_all(&self, message: WsMessage) -> Result<(), ApiError> {
        debug!("Broadcasting message to all connections");
        self.broadcast_to_topic(SubscriptionTopic::All, message).await
    }

    /// Check if a message should be sent to a specific connection based on subscriptions
    #[instrument(
        name = "should_send_to_connection", 
        level = "trace",
        fields(
            topic = %topic.to_string(),
            connection_id = %connection_id
        )
    )]
    async fn should_send_to_connection(
        &self,
        topic: &SubscriptionTopic,
        connection_id: ConnectionId,
    ) -> bool {
        let connections = self.connections.read().await;
        
        if let Some(connection) = connections.get(&connection_id) {
            let should_send = match topic {
                SubscriptionTopic::Direct(target_id) => *target_id == connection_id,
                _ => {
                    connection.subscriptions.contains(&"all".to_string()) ||
                    connection.subscriptions.contains(&topic.to_string())
                }
            };
            
            trace!(
                should_send,
                subscriptions = ?connection.subscriptions,
                "Determined if message should be sent to connection"
            );
            
            should_send
        } else {
            warn!("Attempted to check subscriptions for non-existent connection");
            false
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// CONNECTION HEALTH AND MONITORING
// ═══════════════════════════════════════════════════════════════════════════════════
// Functions for monitoring connection health, updating ping times, and managing
// connection lifecycle events.

impl WebSocketService {
    /// Update last ping time for a connection with debugging
    #[instrument(name = "update_last_ping", level = "trace", fields(connection_id = %connection_id))]
    async fn update_last_ping(&self, connection_id: ConnectionId) {
        let update_time = chrono::Utc::now();
        let mut connections = self.connections.write().await;
        
        if let Some(connection) = connections.get_mut(&connection_id) {
            let previous_ping = connection.last_ping;
            connection.last_ping = Some(update_time);
            
            trace!(
                previous_ping = ?previous_ping,
                new_ping = %update_time,
                "Updated last ping time"
            );
        } else {
            warn!("Attempted to update ping for non-existent connection");
        }
    }

    /// Get connection health status for debugging
    #[instrument(name = "get_connection_health", level = "debug")]
    pub async fn get_connection_health(&self, connection_id: ConnectionId) -> Option<ConnectionHealth> {
        let connections = self.connections.read().await;
        
        if let Some(connection) = connections.get(&connection_id) {
            let now = chrono::Utc::now();
            let connected_duration = now - connection.connected_at;
            let last_ping_duration = connection.last_ping
                .map(|ping| now - ping);
            
            let is_healthy = last_ping_duration
                .map(|duration| duration < chrono::Duration::from_std(self.config.connection_timeout).unwrap())
                .unwrap_or(connected_duration < chrono::Duration::from_std(self.config.connection_timeout).unwrap());

            let health = ConnectionHealth {
                connection_id,
                is_healthy,
                connected_duration,
                last_ping_duration,
                subscription_count: connection.subscriptions.len(),
                subscriptions: connection.subscriptions.clone(),
            };

            debug!(?health, "Generated connection health status");
            Some(health)
        } else {
            debug!("Connection health requested for non-existent connection");
            None
        }
    }

    /// Get health status for all connections
    #[instrument(name = "get_all_connection_health", level = "debug")]
    pub async fn get_all_connection_health(&self) -> Vec<ConnectionHealth> {
        let connections = self.connections.read().await;
        let mut health_reports = Vec::new();

        for &_connection_id in connections.keys() {
            // We need to collect the keys first to avoid holding the lock
        }
        
        // Now get health for each connection without holding the main lock
        let connection_ids: Vec<ConnectionId> = {
            let connections = self.connections.read().await;
            connections.keys().copied().collect()
        };

        for connection_id in connection_ids {
            if let Some(health) = self.get_connection_health(connection_id).await {
                health_reports.push(health);
            }
        }

        info!(
            total_health_reports = health_reports.len(),
            healthy_connections = health_reports.iter().filter(|h| h.is_healthy).count(),
            "Generated health reports for all connections"
        );

        health_reports
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// BACKGROUND TASKS AND MAINTENANCE
// ═══════════════════════════════════════════════════════════════════════════════════
// Background tasks for connection cleanup, health monitoring, and periodic maintenance.
// These tasks run continuously to ensure service stability and performance.

impl WebSocketService {
    /// Start background tasks with enhanced monitoring
    #[instrument(name = "start_background_tasks", level = "info")]
    pub async fn start_background_tasks(&self) {
        info!("Starting WebSocket service background tasks");

        // Connection cleanup task
        let cleanup_service = self.clone();
        tokio::spawn(async move {
            let span = tracing::info_span!("cleanup_task");
            let _enter = span.enter();
            info!("Starting connection cleanup task");
            cleanup_service.connection_cleanup_task().await;
        });

        // Ping task
        let ping_service = self.clone();
        tokio::spawn(async move {
            let span = tracing::info_span!("ping_task");
            let _enter = span.enter();
            info!("Starting ping task");
            ping_service.ping_task().await;
        });

        // Health monitoring task
        let health_service = self.clone();
        tokio::spawn(async move {
            let span = tracing::info_span!("health_monitor_task");
            let _enter = span.enter();
            info!("Starting health monitoring task");
            health_service.health_monitoring_task().await;
        });

        info!("All background tasks started successfully");
    }

    /// Background task to clean up stale connections with detailed logging
    #[instrument(name = "connection_cleanup_task", level = "debug")]
    async fn connection_cleanup_task(&self) {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        let mut cleanup_cycles = 0u64;
        
        info!(
            cleanup_interval_seconds = 60,
            connection_timeout = ?self.config.connection_timeout,
            "Connection cleanup task started"
        );
        
        loop {
            interval.tick().await;
            cleanup_cycles += 1;
            
            let cleanup_start = Instant::now();
            let timeout_threshold = chrono::Utc::now() - 
                chrono::Duration::from_std(self.config.connection_timeout).unwrap();
            
            debug!(
                cleanup_cycle = cleanup_cycles,
                timeout_threshold = %timeout_threshold,
                "Starting cleanup cycle"
            );

            let mut to_remove = Vec::new();
            
            {
                let connections = self.connections.read().await;
                debug!(
                    total_connections = connections.len(),
                    "Scanning connections for cleanup"
                );
                
                for (id, info) in connections.iter() {
                    let should_remove = if let Some(last_ping) = info.last_ping {
                        last_ping < timeout_threshold
                    } else {
                        info.connected_at < timeout_threshold
                    };

                    if should_remove {
                        let time_since_activity = if let Some(last_ping) = info.last_ping {
                            chrono::Utc::now() - last_ping
                        } else {
                            chrono::Utc::now() - info.connected_at
                        };

                        debug!(
                            connection_id = %id,
                            time_since_activity_seconds = time_since_activity.num_seconds(),
                            "Marking connection for cleanup (stale)"
                        );
                        
                        to_remove.push(*id);
                    }
                }
            }
            
            let removed_count = to_remove.len();
            for id in to_remove {
                warn!(
                    connection_id = %id,
                    "Cleaning up stale connection"
                );
                self.cleanup_connection(id).await;
            }

            let cleanup_duration = cleanup_start.elapsed();
            if removed_count > 0 {
                warn!(
                    cleanup_cycle = cleanup_cycles,
                    removed_connections = removed_count,
                    cleanup_duration_ms = cleanup_duration.as_millis(),
                    remaining_connections = self.connection_count(),
                    "Cleanup cycle completed with removals"
                );
            } else {
                debug!(
                    cleanup_cycle = cleanup_cycles,
                    cleanup_duration_ms = cleanup_duration.as_millis(),
                    active_connections = self.connection_count(),
                    "Cleanup cycle completed - no stale connections found"
                );
            }
        }
    }
     //==================================================================
    /// Background task to send periodic pings with monitoring
    //===================================================================
    /// Background task to send periodic pings with monitoring
    #[instrument(name = "ping_task", level = "debug")]
    async fn ping_task(&self) {
        let mut interval = tokio::time::interval(self.config.ping_interval);
        let mut ping_cycles = 0u64;
        
        info!(
            ping_interval = ?self.config.ping_interval,
            "Ping task started"
        );
        
        // Wait for the first tick to avoid immediate ping on startup
        interval.tick().await;
        
        loop {
            interval.tick().await;
            ping_cycles += 1;
            
            let ping_start = Instant::now();
            let active_connections = self.connection_count();
            
            // Only send ping if there are active connections
            if active_connections == 0 {
                trace!(
                    ping_cycle = ping_cycles,
                    "Skipping ping - no active connections"
                );
                continue;
            }
            
            debug!(
                ping_cycle = ping_cycles,
                active_connections,
                "Sending periodic ping to all connections"
            );

            match self.broadcast_to_all(WsMessage::Ping).await {
                Ok(()) => {
                    debug!(
                        ping_cycle = ping_cycles,
                        ping_duration_ms = ping_start.elapsed().as_millis(),
                        "Ping broadcast completed successfully"
                    );
                }
                Err(e) => {
                    error!(
                        ping_cycle = ping_cycles,
                        error = %e,
                        ping_duration_ms = ping_start.elapsed().as_millis(),
                        "Failed to broadcast ping"
                    );
                }
            }
        }
    }
    //===================================================================
    /// Background task for health monitoring and metrics
    #[instrument(name = "health_monitoring_task", level = "debug")]
    async fn health_monitoring_task(&self) {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(300)); // 5 minutes
        let mut monitoring_cycles = 0u64;
        
        info!("Health monitoring task started");
        
        loop {
            interval.tick().await;
            monitoring_cycles += 1;
            
            let monitor_start = Instant::now();
            let stats = self.get_service_stats().await;
            let health_reports = self.get_all_connection_health().await;
            
            let healthy_count = health_reports.iter().filter(|h| h.is_healthy).count();
            let unhealthy_count = health_reports.len() - healthy_count;

            info!(
                monitoring_cycle = monitoring_cycles,
                total_connections = stats.total_connections,
                healthy_connections = healthy_count,
                unhealthy_connections = unhealthy_count,
                subscriber_count = stats.subscriber_count,
                topic_count = stats.topic_subscriptions.len(),
                monitor_duration_ms = monitor_start.elapsed().as_millis(),
                "Health monitoring cycle completed"
            );

            if unhealthy_count > 0 {
                warn!(
                    unhealthy_connections = unhealthy_count,
                    "Found unhealthy connections during monitoring"
                );
            }

            // Log detailed topic subscription information
            for (topic, count) in &stats.topic_subscriptions {
                debug!(
                    topic = %topic,
                    subscriber_count = count,
                    "Topic subscription details"
                );
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// DEBUGGING AND DIAGNOSTICS STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════════════
// Data structures for debugging, monitoring, and diagnostics. These provide insights
// into service performance and connection health.

/// Service statistics for monitoring and debugging
#[derive(Debug, Clone)]
pub struct ServiceStats {
    pub total_connections: usize,
    pub subscriber_count: usize,
    pub topic_subscriptions: HashMap<String, usize>,
    pub uptime: std::time::Duration,
}

/// Connection health information for debugging
#[derive(Debug, Clone)]
pub struct ConnectionHealth {
    pub connection_id: ConnectionId,
    pub is_healthy: bool,
    pub connected_duration: chrono::Duration,
    pub last_ping_duration: Option<chrono::Duration>,
    pub subscription_count: usize,
    pub subscriptions: Vec<String>,
}

// ═══════════════════════════════════════════════════════════════════════════════════
// ENHANCED DIAGNOSTIC STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════════════
// Additional structures for comprehensive service diagnostics and troubleshooting.

impl WebSocketService {
    /// Get comprehensive service diagnostics with logging
    #[instrument(name = "get_diagnostics", level = "info")]
    pub async fn get_diagnostics(&self) -> ServiceDiagnostics {
        let connections = self.get_connections().await;
        let stats = self.get_service_stats().await;
        let health_reports = self.get_all_connection_health().await;
        let config_issues = self.validate_config();

        let diagnostics = ServiceDiagnostics {
            service_stats: stats,
            connection_health: health_reports,
            config_issues,
            broadcaster_stats: BroadcasterStats {
                receiver_count: self.broadcaster.receiver_count(),
                is_closed: self.broadcaster.receiver_count() == 0, // Fixed line
            },
            memory_usage: MemoryUsage {
                connection_registry_size: connections.len(),
                estimated_memory_kb: connections.len() * 8, // Rough estimate
            },
        };

        info!(?diagnostics, "Generated comprehensive service diagnostics");
        diagnostics
    }
}


/// Comprehensive service diagnostics
#[derive(Debug, Clone)]
pub struct ServiceDiagnostics {
    pub service_stats: ServiceStats,
    pub connection_health: Vec<ConnectionHealth>,
    pub config_issues: Vec<String>,
    pub broadcaster_stats: BroadcasterStats,
    pub memory_usage: MemoryUsage,
}

/// Broadcaster channel statistics
#[derive(Debug, Clone)]
pub struct BroadcasterStats {
    pub receiver_count: usize,
    pub is_closed: bool,
}

/// Memory usage estimates
#[derive(Debug, Clone)]
pub struct MemoryUsage {
    pub connection_registry_size: usize,
    pub estimated_memory_kb: usize,
}

// ═══════════════════════════════════════════════════════════════════════════════════
// FRONTEND CONNECTION DEBUGGING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════════
// Specific debugging functions to help troubleshoot frontend connection issues.

impl WebSocketService {
    /// Log detailed information about a failed connection attempt
    #[instrument(name = "debug_connection_failure", level = "error")]
    pub async fn debug_connection_failure(&self, error_context: &str) {
        error!(
            error_context = %error_context,
            current_connections = self.connection_count(),
            max_connections = self.config.max_connections,
            "Connection failure debugging information"
        );

        let diagnostics = self.get_diagnostics().await;
        error!(?diagnostics, "Full service diagnostics at failure time");
    }

    /// Simulate a frontend connection for testing
    #[instrument(name = "simulate_frontend_connection", level = "info")]
    pub async fn simulate_frontend_connection(&self) -> Result<(), ApiError> {
        info!("Simulating frontend connection for testing");

        // Create a test message that a frontend might send
        let test_messages = vec![
            WsMessage::Subscribe { topics: vec!["test".to_string()] },
            WsMessage::Custom { 
                event: "frontend_test".to_string(), 
                data: serde_json::json!({"test": true})
            },
            WsMessage::Ping,
        ];

        for (i, msg) in test_messages.iter().enumerate() {
            debug!(
                test_step = i + 1,
                message_type = ?std::mem::discriminant(msg),
                "Simulating frontend message"
            );

            let serialized = serde_json::to_string(msg)
                .map_err(|e| {
                    error!(error = %e, "Failed to serialize test message");
                    ApiError::SerializationError(e.to_string())
                })?;

            info!(
                test_step = i + 1,
                serialized_message = %serialized,
                "Test message serialization successful"
            );
        }

        info!("Frontend connection simulation completed successfully");
        Ok(())
    }

    /// Validate service configuration and log potential issues
    #[instrument(name = "validate_config", level = "info")]
    pub fn validate_config(&self) -> Vec<String> {
        let mut issues = Vec::new();

        info!("Validating WebSocket service configuration");

        if self.config.max_connections == 0 {
            let issue = "max_connections is set to 0 - no connections will be allowed".to_string();
            warn!("{}", issue);
            issues.push(issue);
        }

        if self.config.ping_interval.as_secs() > 300 {
            let issue = format!(
                "ping_interval is very long ({} seconds) - may cause connection timeouts",
                self.config.ping_interval.as_secs()
            );
            warn!("{}", issue);
            issues.push(issue);
        }

        if self.config.connection_timeout.as_secs() < 30 {
            let issue = format!(
                "connection_timeout is very short ({} seconds) - may cause premature disconnections",
                self.config.connection_timeout.as_secs()
            );
            warn!("{}", issue);
            issues.push(issue);
        }

        if self.config.ping_interval >= self.config.connection_timeout {
            let issue = "ping_interval is greater than or equal to connection_timeout - connections may timeout before ping".to_string();
            error!("{}", issue);
            issues.push(issue);
        }

        if issues.is_empty() {
            info!("Configuration validation passed - no issues found");
        } else {
            warn!(
                issue_count = issues.len(),
                "Configuration validation found potential issues"
            );
        }

        issues
    }

    /// Force cleanup of a specific connection (for debugging)
    #[instrument(name = "force_cleanup_connection", level = "warn")]
    pub async fn force_cleanup_connection(&self, connection_id: ConnectionId) -> bool {
        warn!("Force cleanup requested for connection");
        
        let existed = {
            let connections = self.connections.read().await;
            connections.contains_key(&connection_id)
        };

        if existed {
            self.cleanup_connection(connection_id).await;
            warn!("Force cleanup completed");
            true
        } else {
            warn!("Force cleanup requested for non-existent connection");
            false
        }
    }

    /// Test message broadcasting for debugging purposes
    #[instrument(name = "test_broadcast", level = "info")]
    pub async fn test_broadcast(&self, test_message: String) -> Result<(), ApiError> {
        info!(
            test_message = %test_message,
            "Starting broadcast test"
        );

        let test_msg = WsMessage::Custom {
            event: "test".to_string(),
            data: serde_json::json!({
                "message": test_message,
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "test_id": format!("test_{}", chrono::Utc::now().timestamp())
            }),
        };

        let broadcast_result = self.broadcast_to_all(test_msg).await;
        
        match broadcast_result {
            Ok(()) => {
                info!("Broadcast test completed successfully");
                Ok(())
            }
            Err(e) => {
                error!(
                    error = %e,
                    "Broadcast test failed"
                );
                Err(e)
            }
        }
    }
}
