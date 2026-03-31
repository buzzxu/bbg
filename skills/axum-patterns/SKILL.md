---
name: axum-patterns
category: rust
description: Axum patterns including extractors, middleware, state management, error handling, and tower layers
---

# Axum Patterns

## Overview

Use this skill when building or reviewing Axum web applications in Rust. These patterns cover the extractor system, shared state, tower middleware composition, and idiomatic error handling.

## Key Patterns

### Router Setup with State

```rust
use axum::{Router, routing::{get, post}, extract::State};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
struct AppState {
    db: sqlx::PgPool,
    cache: Arc<RwLock<HashMap<String, String>>>,
}

#[tokio::main]
async fn main() {
    let state = AppState {
        db: sqlx::PgPool::connect("postgres://...").await.unwrap(),
        cache: Arc::new(RwLock::new(HashMap::new())),
    };

    let app = Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/{id}", get(get_user).delete(delete_user))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### Extractors

```rust
use axum::{extract::{Path, Query, Json, State}, http::StatusCode};
use serde::Deserialize;

#[derive(Deserialize)]
struct Pagination {
    page: Option<u32>,
    per_page: Option<u32>,
}

async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<Pagination>,
) -> Result<Json<Vec<User>>, AppError> {
    let page = params.page.unwrap_or(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let users = sqlx::query_as!(User, "SELECT * FROM users LIMIT $1 OFFSET $2",
            per_page as i64, ((page - 1) * per_page) as i64)
        .fetch_all(&state.db)
        .await?;
    Ok(Json(users))
}

async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<User>, AppError> {
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(user))
}
```

### Error Handling with IntoResponse

```rust
use axum::{response::IntoResponse, http::StatusCode, Json};

#[derive(Debug)]
enum AppError {
    NotFound,
    Unauthorized,
    Database(sqlx::Error),
    Validation(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "resource not found".to_string()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized".to_string()),
            AppError::Database(e) => {
                tracing::error!("database error: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal error".to_string())
            }
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
        };
        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self { AppError::Database(e) }
}
```

### Tower Middleware Layers

```rust
use axum::middleware::{self, Next};
use axum::extract::Request;
use axum::response::Response;
use std::time::Instant;

async fn logging_middleware(req: Request, next: Next) -> Response {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let start = Instant::now();

    let response = next.run(req).await;

    tracing::info!(
        method = %method,
        uri = %uri,
        status = response.status().as_u16(),
        duration_ms = start.elapsed().as_millis(),
    );
    response
}

async fn auth_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let token = req.headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let user = verify_token(token, &state.db).await?;
    req.extensions_mut().insert(user);
    Ok(next.run(req).await)
}

// Apply to router
let app = Router::new()
    .route("/protected", get(protected_handler))
    .route_layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
    .layer(middleware::from_fn(logging_middleware));
```

### Graceful Shutdown

```rust
let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
axum::serve(listener, app)
    .with_graceful_shutdown(shutdown_signal())
    .await
    .unwrap();

async fn shutdown_signal() {
    tokio::signal::ctrl_c().await.expect("failed to listen for ctrl+c");
    tracing::info!("shutdown signal received");
}
```

## Best Practices

- Use `State` extractor for shared resources (DB pool, config)
- Implement `IntoResponse` on a custom error enum for consistent error responses
- Use tower layers for cross-cutting concerns (logging, auth, rate limiting)
- Use `tracing` crate for structured logging throughout handlers and middleware
- Keep handlers small — delegate business logic to service structs
- Use `#[derive(Deserialize)]` on query/path parameter structs for validation

## Anti-patterns

- Cloning the entire `AppState` when only a DB pool is needed — use `Arc` internally
- Panicking in handlers — always return `Result<impl IntoResponse, AppError>`
- Blocking in async handlers — use `tokio::task::spawn_blocking` for CPU work
- Putting middleware on individual routes when a `route_layer` covers the group
- Ignoring extractor ordering — extractors that consume the body must come last

## Testing Strategy

- Use `axum::test::TestClient` or `reqwest` with a spawned server for HTTP tests
- Test extractors by constructing `Request` objects directly
- Test error types by asserting `IntoResponse` produces correct status codes
- Use `sqlx::test` macro with Postgres fixtures for database handler tests
- Use `tower::ServiceExt` to call the router as a tower `Service` in tests
