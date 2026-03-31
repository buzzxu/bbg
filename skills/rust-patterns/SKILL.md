---
name: rust-patterns
category: rust
description: Rust idioms including ownership, lifetimes, traits, error handling with thiserror/anyhow, and async with tokio
---

# Rust Patterns

## Overview

Use this skill when writing or reviewing Rust code. These patterns address ownership semantics, idiomatic error handling, trait design, and async programming with tokio.

## Key Patterns

### Ownership and Borrowing

```rust
// Take ownership when the function needs to store or consume the value
fn register(user: User) -> UserId {
    let id = user.id.clone();
    DATABASE.lock().unwrap().insert(id.clone(), user); // user moved into map
    id
}

// Borrow when reading — cheapest option
fn display(user: &User) {
    println!("{}: {}", user.id, user.name);
}

// Mutable borrow when modifying in place
fn activate(user: &mut User) {
    user.active = true;
}

// Use Cow for optional ownership
use std::borrow::Cow;
fn normalize(input: &str) -> Cow<'_, str> {
    if input.contains(' ') {
        Cow::Owned(input.replace(' ', "_"))
    } else {
        Cow::Borrowed(input) // zero allocation for the common case
    }
}
```

### Error Handling with thiserror and anyhow

```rust
// Library code: use thiserror for typed errors
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("user {0} not found")]
    NotFound(String),
    #[error("unauthorized")]
    Unauthorized,
    #[error("database error")]
    Database(#[from] sqlx::Error),
    #[error("validation failed: {0}")]
    Validation(String),
}

// Application code: use anyhow for ergonomic error propagation
use anyhow::{Context, Result};

async fn process_order(id: &str) -> Result<Order> {
    let order = db::find_order(id)
        .await
        .context("failed to fetch order")?;      // adds context to any error
    let validated = validate(order)
        .context("order validation failed")?;
    Ok(validated)
}
```

### Trait Design

```rust
// Small, focused traits
pub trait Repository {
    type Error;
    async fn find_by_id(&self, id: &str) -> Result<Option<User>, Self::Error>;
    async fn save(&self, user: &User) -> Result<(), Self::Error>;
}

// Blanket implementations with generics
impl<T: AsRef<str>> Greet for T {
    fn greet(&self) -> String {
        format!("Hello, {}!", self.as_ref())
    }
}

// Use trait objects for dynamic dispatch
fn process(handlers: &[Box<dyn Handler>]) {
    for h in handlers {
        h.handle();
    }
}
```

### Builder Pattern

```rust
#[derive(Debug)]
pub struct Config {
    host: String,
    port: u16,
    max_retries: u32,
}

#[derive(Default)]
pub struct ConfigBuilder {
    host: Option<String>,
    port: Option<u16>,
    max_retries: Option<u32>,
}

impl ConfigBuilder {
    pub fn host(mut self, host: impl Into<String>) -> Self {
        self.host = Some(host.into());
        self
    }
    pub fn port(mut self, port: u16) -> Self {
        self.port = Some(port);
        self
    }
    pub fn build(self) -> Result<Config, &'static str> {
        Ok(Config {
            host: self.host.ok_or("host is required")?,
            port: self.port.unwrap_or(8080),
            max_retries: self.max_retries.unwrap_or(3),
        })
    }
}
```

### Async with Tokio

```rust
use tokio::task::JoinSet;

async fn fetch_all(urls: Vec<String>) -> Vec<Result<String, reqwest::Error>> {
    let mut set = JoinSet::new();
    for url in urls {
        set.spawn(async move {
            reqwest::get(&url).await?.text().await
        });
    }

    let mut results = Vec::new();
    while let Some(res) = set.join_next().await {
        results.push(res.unwrap()); // unwrap JoinError, keep inner Result
    }
    results
}

// Graceful shutdown
#[tokio::main]
async fn main() {
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

    tokio::spawn(async move {
        tokio::signal::ctrl_c().await.unwrap();
        let _ = shutdown_tx.send(());
    });

    tokio::select! {
        _ = run_server() => {}
        _ = shutdown_rx => { println!("shutting down"); }
    }
}
```

## Best Practices

- Prefer borrowing (`&T`, `&mut T`) over cloning — clone only when ownership is needed
- Use `thiserror` in libraries, `anyhow` in applications
- Make invalid states unrepresentable with enums and newtypes
- Use `#[must_use]` on Result-returning functions
- Prefer `impl Trait` in arguments over generic bounds when there's only one call site
- Use `Cow<str>` for functions that sometimes allocate

## Anti-patterns

- Using `.unwrap()` in production code — use `?` or handle the error explicitly
- Fighting the borrow checker with `Rc<RefCell<T>>` everywhere — redesign ownership
- Large `match` arms — extract into separate functions
- Ignoring `#[must_use]` warnings on `Result` values
- Blocking in async functions — use `tokio::task::spawn_blocking` for CPU work

## Testing Strategy

- Use `#[cfg(test)] mod tests` for unit tests in the same file
- Use `tests/` directory for integration tests that test the public API
- Use `mockall` or manual trait implementations for dependency mocking
- Use `tokio::test` macro for async test functions
- Use `assert_matches!` macro for enum variant assertions
