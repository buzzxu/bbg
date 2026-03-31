---
name: rust-testing
category: rust
description: Rust testing including unit tests, integration tests, proptest, criterion benchmarks, and test fixtures
---

# Rust Testing

## Overview

Use this skill when writing or reviewing Rust test suites. These patterns cover the built-in test framework, property-based testing with proptest, benchmark-driven optimization with criterion, and test organization strategies.

## Key Patterns

### Unit Tests with Setup Helpers

```rust
// src/service.rs
pub struct UserService { /* ... */ }

#[cfg(test)]
mod tests {
    use super::*;

    fn make_user(name: &str) -> User {
        User {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.to_string(),
            active: true,
        }
    }

    #[test]
    fn deactivate_sets_active_false() {
        let mut user = make_user("Alice");
        user.deactivate();
        assert!(!user.active);
    }

    #[test]
    fn display_name_formats_correctly() {
        let user = make_user("Alice");
        assert_eq!(user.display_name(), "Alice (active)");
    }

    #[test]
    #[should_panic(expected = "name must not be empty")]
    fn rejects_empty_name() {
        User::new("".to_string());
    }
}
```

### Integration Tests (tests/ directory)

```rust
// tests/api_test.rs — tests the public API of the crate
use my_crate::{Config, Server};

#[tokio::test]
async fn server_responds_to_health_check() {
    let server = Server::start(Config::test_default()).await.unwrap();
    let client = reqwest::Client::new();

    let resp = client
        .get(format!("http://{}/health", server.addr()))
        .send()
        .await
        .unwrap();

    assert_eq!(resp.status(), 200);

    let body: serde_json::Value = resp.json().await.unwrap();
    assert_eq!(body["status"], "ok");

    server.shutdown().await.unwrap();
}
```

### Shared Test Fixtures

```rust
// tests/common/mod.rs — shared helpers for integration tests
use testcontainers::{clients::Cli, images::postgres::Postgres};

pub struct TestDb {
    pub pool: sqlx::PgPool,
    _container: testcontainers::Container<'static, Postgres>,
}

impl TestDb {
    pub async fn new() -> Self {
        let docker = Cli::default();
        let container = docker.run(Postgres::default());
        let port = container.get_host_port_ipv4(5432);
        let url = format!("postgres://postgres:postgres@localhost:{}/test", port);
        let pool = sqlx::PgPool::connect(&url).await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        Self { pool, _container: container }
    }
}
```

### Property-Based Testing with Proptest

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn roundtrip_serialization(name in "[a-zA-Z]{1,50}", age in 0u32..150) {
        let user = User { name: name.clone(), age };
        let json = serde_json::to_string(&user).unwrap();
        let decoded: User = serde_json::from_str(&json).unwrap();
        prop_assert_eq!(decoded.name, name);
        prop_assert_eq!(decoded.age, age);
    }

    #[test]
    fn sort_is_idempotent(mut vec in prop::collection::vec(any::<i32>(), 0..100)) {
        vec.sort();
        let once = vec.clone();
        vec.sort();
        prop_assert_eq!(vec, once);
    }
}

// Custom strategies for domain types
fn valid_email() -> impl Strategy<Value = String> {
    ("[a-z]{1,10}@[a-z]{1,10}\\.(com|org|net)").prop_map(|s| s)
}
```

### Criterion Benchmarks

```rust
// benches/sort_bench.rs
use criterion::{criterion_group, criterion_main, Criterion, BenchmarkId};

fn bench_sort(c: &mut Criterion) {
    let mut group = c.benchmark_group("sort");

    for size in [100, 1_000, 10_000] {
        group.bench_with_input(BenchmarkId::from_parameter(size), &size, |b, &size| {
            let data: Vec<i32> = (0..size).rev().collect();
            b.iter(|| {
                let mut v = data.clone();
                v.sort();
                v
            });
        });
    }
    group.finish();
}

criterion_group!(benches, bench_sort);
criterion_main!(benches);
// Run: cargo bench
```

### Mocking with mockall

```rust
use mockall::automock;

#[automock]
pub trait UserRepo {
    async fn find(&self, id: &str) -> Result<Option<User>, DbError>;
    async fn save(&self, user: &User) -> Result<(), DbError>;
}

#[tokio::test]
async fn service_returns_user() {
    let mut mock = MockUserRepo::new();
    mock.expect_find()
        .with(eq("1"))
        .returning(|_| Ok(Some(User { id: "1".into(), name: "Alice".into() })));

    let service = UserService::new(Box::new(mock));
    let user = service.get_user("1").await.unwrap().unwrap();
    assert_eq!(user.name, "Alice");
}
```

## Best Practices

- Put unit tests in `#[cfg(test)] mod tests` inside the source file
- Put integration tests in `tests/` to test through the public API only
- Use `#[should_panic]` for tests that verify panic behavior
- Use `proptest` for serialization roundtrips, parsers, and mathematical properties
- Run `cargo test -- --nocapture` to see println output during debugging
- Use `cargo-nextest` for faster parallel test execution

## Anti-patterns

- Testing private internals by making them `pub` — test through public API
- Using `unwrap()` in test helpers without clear error messages — use `expect()`
- Ignoring `#[cfg(test)]` — test utilities leak into production binary
- Writing benchmarks without a baseline — always compare before/after
- Flaky tests from shared global state — each test should own its resources

## Testing Strategy

- Run `cargo test` on every commit; `cargo clippy` and `cargo fmt --check` in CI
- Use proptest for all serialization/deserialization code
- Benchmark critical paths with criterion before and after optimization
- Use `cargo-llvm-cov` for code coverage reporting
- Separate fast unit tests from slow integration tests with `#[ignore]` attribute
