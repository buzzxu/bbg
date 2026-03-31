# /java-review

## Description
Java/Spring Boot-specific code review focusing on design patterns, Spring idioms, exception handling, and enterprise best practices.

## Usage
```
/java-review [file or directory]
/java-review src/main/java/com/example/service/UserService.java
/java-review src/main/java/
```

## Process
1. **Spring patterns** — Verify proper use of @Service, @Repository, @Controller, @Component
2. **Dependency injection** — Check constructor injection (preferred), avoid field injection
3. **Exception handling** — Verify @ControllerAdvice, proper exception hierarchy, no swallowed exceptions
4. **Security** — Check @PreAuthorize, input validation with @Valid, SQL injection prevention
5. **Transaction management** — Review @Transactional scope, propagation, rollback rules
6. **API design** — REST conventions, proper HTTP methods, response codes, DTO patterns
7. **Testing** — Verify @SpringBootTest, @MockBean, @DataJpaTest usage
8. **Performance** — N+1 queries, lazy loading issues, missing indexes, caching strategy

## Output
Java/Spring-specific findings:
- Architectural violations (wrong layer responsibilities)
- Spring anti-patterns (field injection, overly broad component scanning)
- Security gaps in API endpoints
- Transaction management issues
- Testing gaps and recommendations
- Overall Java code health score

## Rules
- Constructor injection is always preferred over field or setter injection
- Every @RestController endpoint must have input validation
- @Transactional should not be on private methods
- Check for Lombok usage consistency (all or nothing per class)
- Verify application.yml/properties has no hardcoded secrets
- Ensure proper logging levels (not everything is ERROR)

## Examples
```
/java-review src/main/java/com/example/service/
/java-review src/main/java/com/example/controller/UserController.java
/java-review src/main/java/ --include-tests
```
