//! Thalyx Backend Server
//!
//! A high-performance backend service for Thalyx applications featuring:
//! - YAML schema validation and data management
//! - Real-time WebSocket connections
//! - Navigation configuration API
//! - Health monitoring and metrics
//!
//! ## Dependencies
//! - Axum: Web framework for REST APIs and WebSockets
//! - Tokio: Async runtime for high-performance I/O
//! - Serde: JSON/YAML serialization/deserialization
//! - Tracing: Structured logging and instrumentation
//! - Tower HTTP: CORS middleware and utilities
//!
//! ## Quick Start
//! 1. Ensure shared/schemas directory exists with JSON schemas
//! 2. Run: `cargo run`
//! 3. Server starts on http://127.0.0.1:3001
//! 4. Connect via WebSocket: ws://127.0.0.1:3001/ws
//!
//! ## API Endpoints
//! - GET /health - Health check
//! - GET /api/yaml/:schema_name - Get YAML data
//! - GET /api/yaml/:schema_name/validate - Validate YAML
//! - GET /api/schemas - List available schemas
//! - GET /api/navigation - Get navigation config
//! - GET /api/navigation/yaml - Get raw navigation YAML
//! - GET /api/reload - Reload schemas (dev)
//! - GET /ws - WebSocket connection
//! - GET /ws/stats - WebSocket statistics

// =============================================================================
// IMPORTS AND MODULES
// =============================================================================

// Standard library imports
use std::{net::SocketAddr, sync::Arc};

// External crate imports
use tower_http::cors::CorsLayer;
use tracing::{info, Level};

// Internal module declarations
mod models;
mod services;
mod api;
mod routes;

// Internal imports
use services::{YamlService, WebSocketService};

// =============================================================================
// APPLICATION STATE
// =============================================================================

/// Global application state shared across all requests
/// Contains service instances and configuration
#[derive(Clone)]
pub struct AppState {
    /// YAML service for schema validation and data management
    pub yaml_service: Arc<YamlService>,
    
    /// WebSocket service for real-time communication
    pub websocket_service: Arc<WebSocketService>,
}

// =============================================================================
// MAIN APPLICATION ENTRY POINT
// =============================================================================

/// Main application entry point
/// Initializes services, sets up routes, and starts the server
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize structured logging with info level
    tracing_subscriber::fmt().with_max_level(Level::INFO).init();
    info!("Starting Thalyx Backend Server...");

    // =========================================================================
    // SERVICE INITIALIZATION
    // =========================================================================
    
    info!("Initializing YAML service...");
    let yaml_service = Arc::new(YamlService::new("../shared/schemas").await?);
    
    info!("Initializing WebSocket service...");
    let websocket_service = Arc::new(WebSocketService::new(None));
    
    // Start WebSocket background tasks for connection monitoring and pinging
    websocket_service.start_background_tasks().await;
    info!("WebSocket background tasks started");

    // Create application state with shared services
    let state = AppState { 
        yaml_service,
        websocket_service,
    };

    // =========================================================================
    // APPLICATION CONFIGURATION
    // =========================================================================
    
    info!("Configuring application routes...");
    let app = routes::create_routes()
        .with_state(state)
        .layer(CorsLayer::permissive());

    // =========================================================================
    // SERVER STARTUP
    // =========================================================================
    
    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
    info!("Server listening on {}", addr);
    info!("WebSocket endpoint available at ws://{}/ws", addr);
    info!("API documentation available at http://{}/health", addr);
    
    // Bind to address and start serving requests
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    
    Ok(())
}
