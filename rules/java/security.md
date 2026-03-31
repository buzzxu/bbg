# Security: Java

Java-specific security rules for web applications and services.

## Mandatory

- Use Spring Security for authentication and authorization — never roll custom auth frameworks
- Use `PreparedStatement` or JPA parameterized queries — never concatenate SQL strings
- Validate all input with Bean Validation (`@NotNull`, `@Size`, `@Email`, `@Pattern`) on DTOs
- Enable CSRF protection for browser-facing endpoints — disable only for stateless APIs with tokens
- Configure CORS explicitly per endpoint — never use `@CrossOrigin("*")` with credentials
- Use `BCryptPasswordEncoder` or `Argon2PasswordEncoder` for password hashing
- Set security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`

## Recommended

- Use method-level security (`@PreAuthorize`, `@Secured`) for fine-grained access control
- Implement OAuth2/OIDC with Spring Security's built-in support for SSO flows
- Use `@AuthenticationPrincipal` to inject the current user — never extract from `SecurityContext` manually
- Configure rate limiting at the API gateway or with a filter — protect auth endpoints especially
- Use `spring-boot-starter-oauth2-resource-server` for JWT validation in API services
- Audit all authentication events with Spring Security's `AuthenticationEventPublisher`
- Use `SecureRandom` for all security-sensitive random number generation
- Pin dependencies and use `OWASP dependency-check-maven` plugin in CI

## Forbidden

- SQL string concatenation: `"SELECT * FROM users WHERE id = '" + id + "'"`
- Disabling CSRF globally without switching to stateless token-based auth
- Storing passwords with MD5, SHA-1, or any unsalted hash algorithm
- `@CrossOrigin("*")` on endpoints that accept credentials or cookies
- Logging passwords, tokens, or session IDs at any log level
- Disabling Spring Security auto-configuration without providing a replacement
- Using `java.util.Random` for security tokens — use `java.security.SecureRandom`

## Examples

```java
// Good: Spring Security configuration
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .build();
    }
}

// Good: Bean Validation on DTO
public record CreateUserRequest(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 12) String password
) {}

// Bad: No validation
public record CreateUserRequest(String name, String email, String password) {}

// Good: Parameterized query
@Query("SELECT u FROM User u WHERE u.email = :email")
Optional<User> findByEmail(@Param("email") String email);

// Bad: Concatenated query
@Query("SELECT u FROM User u WHERE u.email = '" + email + "'")  // INJECTION
```
