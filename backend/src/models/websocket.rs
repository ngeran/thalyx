// backend/src/models/websocket.rs

//! # WebSocket Models
//!
//! ## Description
//! Defines the data structures and types for WebSocket communication in the Thalyx backend.
//! Includes message types, connection metadata, subscription topics, and configuration.
//!
//! ## Dependencies
//! - `serde` - Serialization/deserialization
//! - `uuid` - Unique identifier generation
//! - `chrono` - DateTime handling
//! - `std::collections` - HashMap for metadata storage
//!
//! ## How to Use
//! 1. Use `WsMessage` enum for all WebSocket communication
//! 2. Manage connections with `ConnectionInfo` struct
//! 3. Use `SubscriptionTopic` for message filtering
//! 4. Configure service with `WsConfig`
//!
//! ## Message Types
//! - Connection management (Ping/Pong, ConnectionEstablished)
//! - Subscription management (Subscribe/Unsubscribe)
//! - Navigation updates
//! - File system events
//! - Real-time data updates
//! - Error handling
//! - Custom events

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// ═══════════════════════════════════════════════════════════════════════════════════
// CONNECTION ID TYPE
// ═══════════════════════════════════════════════════════════════════════════════════
// Unique identifier type for WebSocket connections using UUID v4

/// Unique identifier for WebSocket connections
pub type ConnectionId = Uuid;

// ═══════════════════════════════════════════════════════════════════════════════════
// WEBSOCKET MESSAGE ENUM
// ═══════════════════════════════════════════════════════════════════════════════════
// All possible WebSocket message types with structured payloads
// Uses serde tag/content for discriminative serialization

/// WebSocket message types for type-safe communication
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum WsMessage {
    // Connection management messages
    ConnectionEstablished { connection_id: ConnectionId },
    Ping,
    Pong,
    
    // Subscription management messages
    Subscribe { topics: Vec<String> },
    Unsubscribe { topics: Vec<String> },
    
    // Navigation updates
    NavigationUpdated { schema: String, data: serde_json::Value },
    SchemaReloaded { schema: String },
    
    // File system events
    FileChanged { path: String, event_type: String },
    
    // Real-time data updates
    DataUpdate { 
        source: String, 
        data: serde_json::Value,
        timestamp: chrono::DateTime<chrono::Utc>,
    },
    
    // Error handling
    Error { message: String, code: Option<u16> },
    
    // Custom events (extensible)
    Custom { event: String, data: serde_json::Value },
}

// ═══════════════════════════════════════════════════════════════════════════════════
// CONNECTION INFO STRUCT
// ═══════════════════════════════════════════════════════════════════════════════════
// Metadata and state information for active WebSocket connections

/// WebSocket connection metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub id: ConnectionId,
    pub connected_at: chrono::DateTime<chrono::Utc>,
    pub last_ping: Option<chrono::DateTime<chrono::Utc>>,
    pub subscriptions: Vec<String>, // Topics the client is subscribed to
    pub metadata: HashMap<String, String>, // Additional client info
}

impl ConnectionInfo {
    /// Create a new connection info with generated UUID and current timestamp
    pub fn new() -> Self {
        Self {
            id: Uuid::new_v4(),
            connected_at: chrono::Utc::now(),
            last_ping: None,
            subscriptions: Vec::new(),
            metadata: HashMap::new(),
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION TOPIC ENUM
// ═══════════════════════════════════════════════════════════════════════════════════
// Topics for message filtering and routing
// Supports both predefined and dynamic topics

/// Subscription topics for filtering messages
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum SubscriptionTopic {
    Navigation,
    FileSystem,
    DataUpdates(String), // Specific data source
    All,
    Direct(ConnectionId), // Direct messages to specific connection
}

// ═══════════════════════════════════════════════════════════════════════════════════
// TOPIC STRING CONVERSIONS
// ═══════════════════════════════════════════════════════════════════════════════════
// Implementations for converting between SubscriptionTopic and String
// Enables topic-based message routing and filtering

impl ToString for SubscriptionTopic {
    fn to_string(&self) -> String {
        match self {
            Self::Navigation => "navigation".to_string(),
            Self::FileSystem => "filesystem".to_string(),
            Self::DataUpdates(source) => format!("data:{}", source),
            Self::All => "all".to_string(),
            Self::Direct(conn_id) => format!("direct:{}", conn_id),
        }
    }
}

impl From<&str> for SubscriptionTopic {
    fn from(s: &str) -> Self {
        match s {
            "navigation" => Self::Navigation,
            "filesystem" => Self::FileSystem,
            "all" => Self::All,
            s if s.starts_with("data:") => {
                Self::DataUpdates(s.strip_prefix("data:").unwrap_or("").to_string())
            }
            s if s.starts_with("direct:") => {
                if let Some(uuid_str) = s.strip_prefix("direct:") {
                    if let Ok(uuid) = Uuid::parse_str(uuid_str) {
                        return Self::Direct(uuid);
                    }
                }
                Self::All
            }
            _ => Self::All, // Default fallback
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// WEBSOCKET CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════
// Service configuration parameters with sensible defaults

/// WebSocket configuration
#[derive(Debug, Clone)]
pub struct WsConfig {
    pub ping_interval: std::time::Duration,
    pub connection_timeout: std::time::Duration,
    pub max_connections: usize,
    pub buffer_size: Option<usize>, // Optional buffer size with default
}

impl Default for WsConfig {
    fn default() -> Self {
        Self {
            ping_interval: std::time::Duration::from_secs(30),
            connection_timeout: std::time::Duration::from_secs(300), // 5 minutes
            max_connections: 1000,
            buffer_size: Some(1024 * 64), // 64KB default buffer
        }
    }
}
