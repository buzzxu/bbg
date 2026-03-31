# Coding Style: Rust

Rust-specific coding style rules layered on top of common rules.

## Mandatory

- Run `cargo clippy` with `#![deny(clippy::all, clippy::pedantic)]` — fix all warnings
- Use `thiserror` for library error types; `anyhow` for application-level error handling
- Model states with enums and pattern matching — prefer the type system over runtime checks
- Use `impl Trait` in function signatures for simple generic bounds — named generics for complex ones
- Follow the ownership rules: prefer borrowing (`&T`, `&mut T`) over cloning unless necessary
- Document all public items with `///` doc comments — include examples that compile as doctests
- Use `#[must_use]` on functions whose return values should not be ignored (especially `Result`)

## Recommended

- Use the `?` operator for error propagation — avoid manual `match` on `Result` for forwarding
- Prefer `&str` over `String` in function parameters — accept the most general form
- Use `From`/`Into` traits for type conversions — avoid `as` casts for non-primitive types
- Use `derive` macros for `Debug`, `Clone`, `PartialEq` on all public types
- Use `newtype` pattern for type-safe wrappers: `struct UserId(String)`
- Use `Option::map`, `and_then`, `unwrap_or_else` combinators over `match` for simple transforms
- Prefer `Vec::with_capacity()` when the size is known — avoid repeated allocations
- Use `Cow<str>` for functions that may or may not need to allocate
- Keep `unsafe` blocks as small as possible with a `// SAFETY:` comment explaining the invariant

## Forbidden

- `unwrap()` or `expect()` in library code — always propagate errors to the caller
- `unsafe` without a `// SAFETY:` comment explaining why the invariant holds
- `.clone()` to satisfy the borrow checker without understanding why — fix the ownership instead
- `panic!()` in library code for recoverable errors — return `Result` or `Option`
- Wildcard dependencies in `Cargo.toml` — always pin to specific major versions
- `String` parameters when `&str` suffices — accept borrows, return owned
- `as` casts between numeric types without overflow checks — use `TryFrom` instead

## Examples

```rust
// Good: thiserror for library errors
#[derive(Debug, thiserror::Error)]
pub enum ParseError {
    #[error("invalid format: {0}")]
    InvalidFormat(String),
    #[error("missing field: {0}")]
    MissingField(&'static str),
}

// Good: Accepting borrows
pub fn greet(name: &str) -> String {
    format!("Hello, {name}!")
}

// Bad: Unnecessary ownership
pub fn greet(name: String) -> String {
    format!("Hello, {name}!")
}

// Good: Newtype pattern
struct UserId(uuid::Uuid);
struct OrderId(uuid::Uuid);
// These types cannot be accidentally swapped in function calls

// Bad: Stringly typed
fn process(user_id: String, order_id: String) { ... }
```


## Related

- **Agents**: [rust-reviewer](../../agents/rust-reviewer.md), [rust-build-resolver](../../agents/rust-build-resolver.md)
- **Skills**: [rust-patterns](../../skills/rust-patterns/SKILL.md)
- **Commands**: [/rust-review](../../commands/rust-review.md), [/rust-build](../../commands/rust-build.md)
