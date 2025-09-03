//! Routes Module
//!
//! This module organizes all API routes into logical groups and provides
//! a centralized route creation function for the main application.

use axum::Router;
use crate::AppState;

// Route modules
mod health;
mod yaml;
mod navigation;
mod websocket;
mod reports;

/// Creates and configures all application routes
/// 
/// This function assembles all route modules into a single router,
/// making it easy to manage and extend the API surface.
/// 
/// # Returns
/// A configured Router with all application routes
pub fn create_routes() -> Router<AppState> {
    Router::new()
        // Health monitoring routes
        .merge(health::routes())
        
        // YAML data management routes
        .merge(yaml::routes())
        
        // Navigation configuration routes
        .merge(navigation::routes())
        
        // Reports management routes
        .merge(reports::routes())
        
        // WebSocket communication routes
        .merge(websocket::routes())
}
