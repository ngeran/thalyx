//! Navigation Configuration Routes
//! 
//! Handles navigation menu configuration and settings

use axum::{routing::get, Router};
use crate::AppState;

/// Creates navigation-related routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/navigation", get(crate::api::navigation::get_navigation))
        .route("/api/navigation/yaml", get(crate::api::navigation::get_navigation_from_yaml))
        .route("/api/navigation/settings", get(crate::api::navigation::get_settings_navigation))
}
