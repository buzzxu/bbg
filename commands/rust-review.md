# /rust-review

## Description
Rust-specific code review focusing on ownership, lifetimes, error handling with Result/Option, and idiomatic Rust patterns.

## Usage
```
/rust-review [file or directory]
/rust-review src/main.rs
/rust-review src/lib/
```

## Process
1. **Ownership & borrowing** — Check for unnecessary clones, proper borrow usage, lifetime annotations
2. **Error handling** — Verify Result/Option usage, proper error types, no unwrap() in production
3. **Unsafe code** — Review all `unsafe` blocks for soundness, document safety invariants
4. **Pattern matching** — Check exhaustive matches, proper use of if-let/while-let
5. **Trait design** — Review trait bounds, blanket implementations, derive usage
6. **Concurrency** — Verify Send/Sync bounds, proper Arc/Mutex usage, no data races
7. **Performance** — Check for unnecessary allocations, proper iterator usage, zero-cost abstractions
8. **Clippy compliance** — Run `cargo clippy` and address all warnings

## Output
Rust-specific findings:
- Ownership issues (unnecessary clones, lifetime problems)
- Error handling gaps (unwrap in non-test code, missing error context)
- Unsafe code audit results
- Performance improvement opportunities
- Clippy warnings and fixes
- Overall Rust code health score

## Rules
- `unwrap()` and `expect()` are only acceptable in tests and examples
- Every `unsafe` block must have a `// SAFETY:` comment explaining invariants
- Prefer `impl Trait` over `Box<dyn Trait>` where possible
- Use `thiserror` for library errors, `anyhow` for application errors
- Check `Cargo.toml` for unnecessary dependencies
- Verify `#[must_use]` on functions returning important values

## Examples
```
/rust-review src/main.rs
/rust-review src/lib/parser/
/rust-review crates/core/
```

## Related

- **Agents**: [rust-reviewer](../agents/rust-reviewer.md)
- **Skills**: [rust-patterns](../skills/rust-patterns/SKILL.md), [axum-patterns](../skills/axum-patterns/SKILL.md)
- **Rules**: [coding-style](../rules/rust/coding-style.md)
