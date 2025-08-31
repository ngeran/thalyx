
use axum::{
    extract::{Query, State},
    response::Json,
};
use std::collections::HashMap;

use crate::{
    models::{ApiResult, NavigationConfig},
    AppState,
};

/// Handler that returns a placeholder navigation config.
/// Currently does not use `state` or `file_path`, so they are prefixed with `_`
/// to avoid compiler warnings.
pub async fn get_navigation(
    Query(params): Query<HashMap<String, String>>,
    State(_state): State<AppState>, // unused for now
) -> ApiResult<Json<NavigationConfig>> {
    let _file_path = params.get("file").cloned(); // unused for now

    // This would typically load navigation data from YAML
    // For now, return a placeholder
    let nav_config = NavigationConfig {
        items: Vec::new(),
        settings: None,
    };

    Ok(Json(nav_config))
}

/// Handler that demonstrates actually using `state` and `file_path`.
/// This will call into the YAML service and fetch navigation data.
pub async fn get_navigation_from_yaml(
    Query(params): Query<HashMap<String, String>>,
    State(state): State<AppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let file_path = params.get("file").cloned();
    let data = state
        .yaml_service
        .get_yaml_data("navigation", file_path.as_deref())
        .await?;
    Ok(Json(data))
}
