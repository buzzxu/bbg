# /rust-test

## Description
Rust-specific TDD workflow using the built-in test framework with `#[test]`, assertion macros, and module-level test organization. Enforces RED-GREEN-IMPROVE cycle with Rust idioms.

## Usage
```
/rust-test "function or behavior to test"
/rust-test "parse_config should handle missing fields"
```

## Process
1. **Understand behavior** — Clarify the function or behavior under test
2. **RED phase** — Write a failing test:
   - Add unit tests in `#[cfg(test)] mod tests` block in the source file
   - Create integration tests in `tests/` directory for public API tests
   - Use `assert!`, `assert_eq!`, `assert_ne!` for assertions
   - Run `cargo test <test_name>` to confirm failure
3. **GREEN phase** — Implement minimum code to pass:
   - No extra logic beyond what tests require
   - Run `cargo test <test_name>` to confirm pass
4. **IMPROVE phase** — Refactor test and implementation:
   - Use `#[should_panic(expected = "message")]` for expected failures
   - Use `#[tokio::test]` for async test functions
   - Add error case tests returning `Result<(), Box<dyn Error>>`
   - Run `cargo tarpaulin` or `cargo llvm-cov` to check coverage
5. **Repeat** — Add more test cases for additional behaviors

## Output
After each cycle:
- Test module with all test functions
- Implementation code
- `cargo test` output at each phase
- Coverage summary

## Rules
- Keep unit tests in `#[cfg(test)] mod tests` inside the source file
- Use `tests/` directory only for integration tests of the public API
- Use `assert_eq!` with descriptive messages: `assert_eq!(got, want, "context")`
- Test `Result` and `Option` return types — verify both `Ok`/`Some` and `Err`/`None`
- Use `#[should_panic]` sparingly — prefer `Result`-based error testing
- Use `#[ignore]` for slow tests and run them explicitly with `cargo test -- --ignored`
- Use test helper functions marked `fn` (not `pub fn`) within the test module

## Examples
```
/rust-test "Handler should return 404 for unknown routes"
/rust-test "parse_config handles empty TOML gracefully"
/rust-test "Cache expires entries after TTL"
```

## Related

- **Agents**: [rust-reviewer](../agents/rust-reviewer.md)
- **Skills**: [rust-testing](../skills/rust-testing/SKILL.md), [tdd-workflow](../skills/tdd-workflow/SKILL.md)
- **Rules**: [testing](../rules/rust/testing.md)
