# Testing: Rust

Rust-specific testing rules using the standard test framework and common crates.

## Mandatory

- Place unit tests in the same file as the code they test, inside a `#[cfg(test)] mod tests` block
- Place integration tests in the `tests/` directory — they test the public API only
- Use `#[should_panic(expected = "message")]` for panic tests — always match the expected message
- Use `assert_eq!` and `assert_ne!` over plain `assert!` for better error messages on failure
- Test both `Ok` and `Err` variants of all `Result`-returning functions
- Ensure all doctests (`///` examples) compile and pass — they run as tests by default
- Use `cargo test --all-features` in CI to test all feature flag combinations

## Recommended

- Use `proptest` for property-based testing — define strategies for complex input types
- Use `criterion` for benchmarks — measure before and after optimization with statistical rigor
- Use `insta` for snapshot testing of serialized output (JSON, debug output, error messages)
- Create test utility modules in `src/testutil.rs` behind `#[cfg(test)]` — share builders/factories
- Use `tempfile` crate for filesystem tests — provides auto-cleaning temporary directories
- Use `tokio::test` or `async-std::test` for async test functions
- Use `mockall` for trait mocking — but prefer real implementations over mocks when feasible
- Use `rstest` for parameterized tests with `#[rstest]` and `#[case]`
- Test error types: verify the error variant, message, and source chain

## Forbidden

- `#[ignore]` without a reason comment and issue reference
- Tests that depend on global state — use function-local setup or test fixtures
- `unwrap()` in tests without a preceding comment explaining why it's safe here
- `thread::sleep()` for timing-dependent tests — use channels or async synchronization
- Testing private functions directly — test through the public API
- Mocking the struct under test — only mock its dependencies (traits)

## Examples

```rust
// Good: Unit test in same file
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_valid_age() {
        assert_eq!(parse_age("25"), Ok(25));
    }

    #[test]
    fn parse_negative_age_returns_error() {
        let err = parse_age("-1").unwrap_err();
        assert_eq!(err.to_string(), "age must be non-negative");
    }

    #[test]
    #[should_panic(expected = "index out of bounds")]
    fn access_beyond_length_panics() {
        let v = vec![1, 2, 3];
        let _ = v[5];
    }
}

// Good: Property-based test with proptest
proptest! {
    #[test]
    fn roundtrip_serialization(input in any::<UserConfig>()) {
        let json = serde_json::to_string(&input).unwrap();
        let output: UserConfig = serde_json::from_str(&json).unwrap();
        prop_assert_eq!(input, output);
    }
}

// Good: Parameterized with rstest
#[rstest]
#[case("admin", true)]
#[case("viewer", false)]
fn test_can_delete(#[case] role: &str, #[case] expected: bool) {
    assert_eq!(can_delete(role), expected);
}
```


## Related

- **Agents**: [rust-reviewer](../../agents/rust-reviewer.md)
- **Skills**: [rust-testing](../../skills/rust-testing/SKILL.md), [tdd-workflow](../../skills/tdd-workflow/SKILL.md)
- **Commands**: [/rust-test](../../commands/rust-test.md), [/tdd](../../commands/tdd.md)
