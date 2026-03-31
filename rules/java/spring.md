# Spring Boot: Java

Best practices for Spring Boot applications.

## Mandatory

- Use constructor injection exclusively — never field injection with `@Autowired`
- Use `@ConfigurationProperties` with records for typed, validated configuration
- Define profiles (`application-dev.yml`, `application-prod.yml`) for environment-specific config
- Use `@RestControllerAdvice` with `@ExceptionHandler` for centralized error handling
- Enable Spring Boot Actuator with health, info, and metrics endpoints in all services
- Use `@Transactional` on service methods, not repository or controller methods
- Return proper HTTP status codes: 201 for creation, 204 for no content, 404 for not found

## Recommended

- Use `@Value` sparingly — prefer `@ConfigurationProperties` for groups of related properties
- Use Spring Profiles to swap implementations: `@Profile("dev")` for local development stubs
- Use `@Validated` on `@ConfigurationProperties` classes to fail fast on missing config
- Enable graceful shutdown: `server.shutdown=graceful` with `spring.lifecycle.timeout-per-shutdown-phase`
- Use `WebClient` (reactive) or `RestClient` (blocking) instead of deprecated `RestTemplate`
- Use `@Cacheable` with explicit cache names and key definitions — configure TTL per cache
- Prefer `@ConditionalOnProperty` for feature flags over runtime if/else checks
- Use `Flyway` or `Liquibase` for database migrations — never JPA auto-DDL in production
- Expose custom health indicators for downstream dependencies

## Forbidden

- Field injection (`@Autowired` on fields) — it hides dependencies and prevents testing
- `@SpringBootTest` loading the full context when a slice test suffices
- `spring.jpa.hibernate.ddl-auto=update` in production — use migration tools
- Catching and re-throwing `RuntimeException` without adding context
- Circular dependencies between beans — refactor to break the cycle with events or restructuring
- Business logic in controllers — controllers validate input and delegate to services
- Hardcoded URLs for external services — use configuration properties

## Examples

```java
// Good: Constructor injection with configuration properties
@ConfigurationProperties(prefix = "app.cache")
public record CacheConfig(Duration ttl, int maxSize) {}

@Service
public class UserService {
    private final UserRepository repository;
    private final CacheConfig cacheConfig;

    public UserService(UserRepository repository, CacheConfig cacheConfig) {
        this.repository = repository;
        this.cacheConfig = cacheConfig;
    }
}

// Bad: Field injection
@Service
public class UserService {
    @Autowired private UserRepository repository;
    @Autowired private CacheConfig cacheConfig;
}

// Good: Centralized exception handling
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(UserNotFoundException ex) {
        return ResponseEntity.status(404)
            .body(new ErrorResponse("NOT_FOUND", ex.getMessage()));
    }
}
```
