# Security: Rust

Rust-specific security rules for applications and libraries.

## Mandatory

- Minimize `unsafe` blocks — each `unsafe` block must have a `// SAFETY:` comment with proof
- Run `cargo audit` in CI to detect known vulnerabilities in dependencies
- Use `ring` or `rustls` for cryptography — never implement custom crypto algorithms
- Validate all external input at the boundary before processing — use `validator` or custom checks
- Use `secrecy::Secret<T>` for sensitive values — it prevents accidental logging and display
- Pin dependency versions in `Cargo.lock` — commit the lockfile for applications
- Use `#[deny(unsafe_code)]` at the crate level for pure-safe libraries

## Recommended

- Use `cargo-deny` to check licenses, ban specific crates, and detect duplicate dependencies
- Use `rustls` over `native-tls` for TLS — it's memory-safe and audited
- Use `argon2` or `bcrypt` crate for password hashing — never raw SHA or MD5
- Use `rand::rngs::OsRng` for cryptographically secure random number generation
- Use `zeroize` crate for securely clearing sensitive memory (keys, passwords) on drop
- Prefer `String` sanitization at parse time — use the newtype pattern with validated constructors
- Enable `#![forbid(unsafe_code)]` for crates that don't need unsafe — make it explicit
- Use `tracing` instead of `println!` — structured logging prevents sensitive data leaks
- Run `cargo-fuzz` on input parsers to discover memory safety issues and panics

## Forbidden

- `unsafe` without a `// SAFETY:` invariant comment — every unsafe block must be justified
- Raw pointer dereference without proving the pointer is valid and aligned
- `std::mem::transmute` except in extremely rare, well-documented cases
- Using C FFI without `#[repr(C)]` and thorough validation of foreign data
- `panic!` in production code paths — return `Result` and handle errors gracefully
- Ignoring `cargo audit` findings — fix or document the accepted risk with justification
- Using `reqwest` or HTTP clients without timeout configuration

## Examples

```rust
// Good: Validated newtype
pub struct Email(String);

impl Email {
    pub fn parse(input: &str) -> Result<Self, ValidationError> {
        if !input.contains('@') || input.len() > 254 {
            return Err(ValidationError::InvalidEmail);
        }
        Ok(Self(input.to_lowercase()))
    }
}

// Good: Secret wrapper
use secrecy::{ExposeSecret, Secret};
struct AppConfig {
    db_password: Secret<String>,
}
fn connect(config: &AppConfig) {
    let pw = config.db_password.expose_secret();
    // pw is only exposed here, not in Debug/Display
}

// Good: Safe crypto
use ring::rand::SystemRandom;
let rng = SystemRandom::new();
let mut token = vec![0u8; 32];
ring::rand::SecureRandom::fill(&rng, &mut token)?;

// Bad: Unsafe without justification
unsafe { std::ptr::read(some_ptr) }  // No SAFETY comment
```
