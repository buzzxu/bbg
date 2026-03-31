# /rust-build

## Description
Fix Rust build errors by running `cargo build` and `cargo check`, following compiler suggestions, and fixing errors systematically with re-verification after each fix.

## Usage
```
/rust-build
/rust-build --lib
/rust-build --release
```

## Process
1. **Run check** — Execute `cargo check` for fast error detection without full compilation
2. **Run clippy** — Execute `cargo clippy` for lint and style warnings
3. **Categorize errors** — Group by type:
   - Ownership/borrow errors (lifetime mismatches, moved values, dangling references)
   - Type errors (mismatched types, trait bounds not satisfied, missing implementations)
   - Module errors (unresolved imports, visibility issues, missing `mod` declarations)
   - Dependency errors (version conflicts, missing features, incompatible crate versions)
4. **Prioritize** — Fix in order: dependencies → modules → types → ownership/borrow
5. **Fix one at a time** — Read compiler suggestions carefully and apply recommended fixes
6. **Re-verify** — Run `cargo check` after each fix
7. **Final check** — Run `cargo build && cargo clippy && cargo test`

## Output
For each error fixed:
- Error message and file:line location
- Root cause analysis
- Fix applied
- Remaining error count

Final summary:
- Total errors found and fixed
- Check status: pass/fail
- Clippy status: pass/fail
- Test status: pass/fail

## Rules
- Always read the full compiler error — Rust's error messages include suggested fixes
- Fix borrow checker errors by understanding ownership, not by cloning indiscriminately
- Run `cargo update` if dependency resolution fails
- Never use `unsafe` blocks to work around borrow checker errors
- Check `Cargo.lock` consistency if builds fail on CI but pass locally
- Use `cargo tree` to diagnose dependency version conflicts
- Run `cargo check` instead of `cargo build` for faster iteration cycles

## Examples
```
/rust-build                  # Build entire project
/rust-build --lib            # Build library only
/rust-build --release        # Build with release optimizations
```

## Related

- **Agents**: [rust-build-resolver](../agents/rust-build-resolver.md)
- **Skills**: [rust-patterns](../skills/rust-patterns/SKILL.md), [ci-cd-patterns](../skills/ci-cd-patterns/SKILL.md)
- **Rules**: [coding-style](../rules/rust/coding-style.md)
