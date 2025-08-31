# YAML API Backend

A Rust-based backend service that reads YAML files, validates them against JSON schemas, and exposes RESTful APIs for frontend consumption.

## Features

- **Generic YAML Reading**: Read any YAML file with schema validation
- **Schema Validation**: Validate YAML content against JSON Schema definitions
- **RESTful API**: Clean REST endpoints for data access
- **Reusable Architecture**: Easy to extend for new YAML file types
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **CORS Support**: Ready for frontend integration

## Project Structure

```
backend/
├── src/
│   ├── api/           # REST endpoints and handlers
│   ├── services/      # Business logic (YAML processing)
│   ├── models/        # Data models and error types
│   └── main.rs        # Application entry point
├── Cargo.toml
└── README.md

shared/
├── schemas/           # JSON schema definitions
│   └── navigation.json
└── data/              # YAML data files
    └── navigation.yaml
```

## Quick Start

1. **Install Rust** (if not already installed):

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Clone and setup**:

   ```bash
   cd backend
   cargo build
   ```

3. **Create the shared directories**:

   ```bash
   mkdir -p ../shared/schemas ../shared/data
   ```

4. **Add your schema and data files** (examples provided)

5. **Run the server**:

   ```bash
   cargo run
   ```

The server will start on `http://localhost:3001`

## API Endpoints

### Health Check

```
GET /health
```

### Get YAML Data

```
GET /api/yaml/{schema_name}?file={optional_file_path}
```

Example: `GET /api/yaml/navigation` returns the navigation.yaml data

### Validate YAML Data

```
GET /api/yaml/{schema_name}/validate?file={optional_file_path}
```

Returns validation results against the schema.

### List Available Schemas

```
GET /api/schemas
```

Returns a list of all available schema names.

### Typed Navigation Endpoint

```
GET /api/navigation?file={optional_file_path}
```

Returns strongly-typed navigation data.

## Usage in React

```javascript
// Fetch navigation data
const response = await fetch('http://localhost:3001/api/yaml/navigation');
const navigationData = await response.json();

// Validate before using
const validation = await fetch('http://localhost:3001/api/yaml/navigation/validate');
const { valid, errors } = await validation.json();

if (valid) {
  // Use navigationData safely
  console.log('Navigation items:', navigationData.items);
} else {
  console.error('Validation errors:', errors);
}
```

## Adding New YAML Types

1. **Create a JSON schema** in `../shared/schemas/your-type.json`
2. **Add your YAML data** in `../shared/data/your-type.yaml`
3. **Use the generic endpoint**: `GET /api/yaml/your-type`
4. **Optional**: Add typed models in `src/models/mod.rs` for better type safety

## Configuration

### Environment Variables

- `SCHEMA_DIR`: Path to schema directory (default: `../shared/schemas`)
- `DATA_DIR`: Path to data directory (default: `../shared/data`)
- `PORT`: Server port (default: `3001`)

### File Structure Requirements

- Schema files must be JSON files with `.json` extension
- Data files should be YAML files with `.yaml` or `.yml` extension
- Schema names are derived from the filename (without extension)

## Error Handling

The API returns structured error responses:

```json
{
  "error": "Description of the error",
  "status": 404
}
```

Common status codes:

- `200`: Success
- `400`: Bad Request (YAML parsing or validation errors)
- `404`: File or schema not found
- `500`: Internal server error

## Development

### Running Tests

```bash
cargo test
```

### Hot Reload (with cargo-watch)

```bash
cargo install cargo-watch
cargo watch -x run
```

### Adding Dependencies

Edit `Cargo.toml` and run:

```bash
cargo build
```

## Schema Validation

The service uses JSON Schema Draft 7 for validation. Your schema files should follow this format:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Your Schema Title",
  "type": "object",
  "properties": {
    // Your schema definition
  }
}
```

## Production Deployment

1. **Build for release**:

   ```bash
   cargo build --release
   ```

2. **Set environment variables**:

   ```bash
   export SCHEMA_DIR=/path/to/schemas
   export DATA_DIR=/path/to/data
   export PORT=3001
   ```

3. **Run the binary**:

   ```bash
   ./target/release/yaml-api-backend
   ```

## Advanced Features

### File Watching (Future Enhancement)

The backend includes the `notify` crate for potential file watching capabilities. This can be extended to automatically reload YAML files when they change:

```rust
// Example implementation for hot reloading
use notify::{Watcher, RecursiveMode, watcher};

// In your service initialization
let (tx, rx) = std::sync::mpsc::channel();
let mut watcher = watcher(tx, Duration::from_secs(1)).unwrap();
watcher.watch(&data_dir, RecursiveMode::Recursive).unwrap();
```

### Custom Validators

You can extend the validation system with custom validators by implementing additional checks in the `YamlService`:

```rust
impl YamlService {
    pub async fn validate_with_custom_rules(
        &self,
        schema_name: &str,
        data: &Value,
        custom_rules: Vec<Box<dyn CustomValidator>>,
    ) -> ApiResult<ValidationResult> {
        // Custom validation logic
    }
}
```

### Caching

For performance optimization, consider adding caching:

```rust
use std::collections::HashMap;
use std::time::SystemTime;

struct CacheEntry {
    data: Value,
    timestamp: SystemTime,
}

// Add to YamlService
cache: HashMap<String, CacheEntry>,
```

## Troubleshooting

### Common Issues

1. **Schema not found**: Ensure your JSON schema file is in the correct directory with a `.json` extension
2. **YAML parsing errors**: Check your YAML syntax using a YAML validator
3. **Validation failures**: Compare your YAML structure against the JSON schema requirements
4. **CORS issues**: The backend includes permissive CORS headers, but you may need to adjust for production

### Logging

The backend uses `tracing` for structured logging. Set the log level:

```bash
RUST_LOG=info cargo run
# or for more verbose logging
RUST_LOG=debug cargo run
```

### Performance Considerations

- Schema compilation happens at startup, so restart the server when schemas change
- Large YAML files are loaded into memory; consider streaming for very large files
- JSON Schema validation is performed on every request; consider caching for high-traffic scenarios

## Security Considerations

1. **Path Traversal**: The service resolves file paths relative to configured directories
2. **Input Validation**: All YAML content is validated against schemas
3. **Error Messages**: Avoid exposing sensitive file system information in error messages
4. **CORS**: Configure CORS appropriately for your domain in production

Replace the permissive CORS layer with:

```rust
use tower_http::cors::{CorsLayer, AllowOrigin};

let cors = CorsLayer::new()
    .allow_origin(AllowOrigin::exact("https://yourdomain.com".parse().unwrap()))
    .allow_methods([Method::GET])
    .allow_headers([CONTENT_TYPE]);
```

## Integration Examples

### React Hook for Navigation

```typescript
import { useState, useEffect } from 'react';

interface NavigationItem {
  id: string;
  label: string;
  url?: string;
  icon?: string;
  children?: NavigationItem[];
  metadata?: any;
}

interface NavigationConfig {
  version: string;
  items: NavigationItem[];
  metadata?: any;
}

export const useNavigation = () => {
  const [navigation, setNavigation] = useState<NavigationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNavigation = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/yaml/navigation');
        if (!response.ok) throw new Error('Failed to fetch navigation');
        
        const data = await response.json();
        setNavigation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchNavigation();
  }, []);

  return { navigation, loading, error };
};
```

### Vue.js Composable

```typescript
import { ref, onMounted } from 'vue';

export function useYamlData(schemaName: string, filePath?: string) {
  const data = ref(null);
  const loading = ref(true);
  const error = ref(null);

  const fetchData = async () => {
    try {
      loading.value = true;
      const url = new URL(`http://localhost:3001/api/yaml/${schemaName}`);
      if (filePath) url.searchParams.set('file', filePath);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      data.value = await response.json();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetchData);
  
  return { data, loading, error, refetch: fetchData };
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `cargo test`
5. Run clippy: `cargo clippy`
6. Format code: `cargo fmt`
7. Commit and push your changes
8. Create a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
