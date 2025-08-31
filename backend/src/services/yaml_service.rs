// backend/src/services/yaml_service.rs
// YAML validation and schema management service

use crate::models::{ApiError, ApiResult};
use serde_json::Value;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};
use tokio::fs;
use tracing::{info, warn};

// Remove these unresolved imports
// use crate::models::{ValidationResult, ValidationError as ValidationErrorModel};
// use jsonschema::{Draft, JSONSchema};

pub struct YamlService {
    schema_dir: PathBuf,
    data_dir: PathBuf,
    schemas: HashMap<String, Value>, // Changed from JSONSchema to Value
}

impl YamlService {
    pub async fn new(schema_dir: &str) -> ApiResult<Self> {
        let schema_path = PathBuf::from(schema_dir);
        let data_path = PathBuf::from("../shared/data"); // Default data directory
        
        if !schema_path.exists() {
            return Err(ApiError::FileNotFound(format!(
                "Schema directory not found: {}",
                schema_path.display()
            )));
        }

        let mut service = Self {
            schema_dir: schema_path,
            data_dir: data_path,
            schemas: HashMap::new(),
        };

        service.load_schemas().await?;
        Ok(service)
    }

    async fn load_schemas(&mut self) -> ApiResult<()> {
        info!("Loading schemas from: {}", self.schema_dir.display());
        
        let mut entries = fs::read_dir(&self.schema_dir)
            .await
            .map_err(ApiError::IoError)?; // Remove .to_string()

        while let Some(entry) = entries.next_entry().await.map_err(ApiError::IoError)? {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    match self.load_schema(&path).await {
                        Ok(schema) => {
                            self.schemas.insert(stem.to_string(), schema);
                            info!("Loaded schema: {}", stem);
                        }
                        Err(e) => {
                            warn!("Failed to load schema {}: {}", stem, e);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    async fn load_schema(&self, schema_path: &Path) -> ApiResult<Value> {
        let content = fs::read_to_string(schema_path)
            .await
            .map_err(ApiError::IoError)?; // Remove .to_string()

        let schema_value: Value = serde_json::from_str(&content)
            .map_err(|e| ApiError::ValidationError(format!("Invalid JSON schema: {}", e)))?;

        Ok(schema_value)
    }

    pub async fn get_yaml_data(
        &self,
        schema_name: &str,
        file_path: Option<&str>,
    ) -> ApiResult<Value> {
        let yaml_path = self.resolve_yaml_path(schema_name, file_path)?;
        
        if !yaml_path.exists() {
            return Err(ApiError::FileNotFound(format!(
                "YAML file not found: {}",
                yaml_path.display()
            )));
        }

        let content = fs::read_to_string(&yaml_path)
            .await
            .map_err(ApiError::IoError)?; // Remove .to_string()

        let yaml_data: Value = serde_yaml::from_str(&content)
            .map_err(|e| ApiError::YamlParseError(e.to_string()))?;

        // Basic validation (placeholder for jsonschema)
        if let Some(schema) = self.schemas.get(schema_name) {
            self.basic_validation(&yaml_data, schema)?;
        }

        Ok(yaml_data)
    }

    pub async fn validate_yaml_data(
        &self,
        schema_name: &str,
        file_path: Option<&str>,
    ) -> ApiResult<Value> {
        let schema = self.schemas.get(schema_name).ok_or_else(|| {
            ApiError::NotFound(format!("Schema '{}' not found", schema_name)) // Use NotFound instead of SchemaNotFound
        })?;

        let yaml_data = self.get_yaml_data(schema_name, file_path).await?;
        
        // Perform basic validation
        self.basic_validation(&yaml_data, schema)?;
        
        Ok(serde_json::json!({
            "valid": true,
            "data": yaml_data
        }))
    }

    // Basic validation logic (placeholder for jsonschema)
    fn basic_validation(&self, data: &Value, schema: &Value) -> ApiResult<()> {
        // Simple type checking as placeholder
        if let Some(expected_type) = schema.get("type") {
            if let Some(actual_type) = data.get("type") {
                if expected_type != actual_type {
                    return Err(ApiError::ValidationError(format!(
                        "Type mismatch: expected {}, got {}",
                        expected_type, actual_type
                    )));
                }
            }
        }
        Ok(())
    }

    pub async fn list_available_schemas(&self) -> ApiResult<Vec<String>> {
        Ok(self.schemas.keys().cloned().collect())
    }

    fn resolve_yaml_path(&self, schema_name: &str, file_path: Option<&str>) -> ApiResult<PathBuf> {
        match file_path {
            Some(path) => {
                // If a specific file path is provided, use it relative to data_dir
                let full_path = self.data_dir.join(path);
                Ok(full_path)
            }
            None => {
                // Default to schema_name.yaml in the data directory
                let default_file = format!("{}.yaml", schema_name);
                Ok(self.data_dir.join(default_file))
            }
        }
    }
}
