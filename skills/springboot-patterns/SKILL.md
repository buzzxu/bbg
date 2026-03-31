---
name: springboot-patterns
category: java
description: Spring Boot patterns including dependency injection, AOP, JPA repositories, security configuration, and actuator
---

# Spring Boot Patterns

## Overview

Use this skill when building or reviewing Spring Boot applications. These patterns cover the core Spring ecosystem: DI, data access, security, cross-cutting concerns with AOP, and production observability.

## Key Patterns

### Constructor Injection (Preferred DI Style)

```java
@Service
public class OrderService {
    private final OrderRepository orderRepo;
    private final PaymentGateway paymentGateway;
    private final EventPublisher events;

    // Single constructor — @Autowired is implicit
    public OrderService(OrderRepository orderRepo, PaymentGateway paymentGateway,
                        EventPublisher events) {
        this.orderRepo = orderRepo;
        this.paymentGateway = paymentGateway;
        this.events = events;
    }

    @Transactional
    public Order placeOrder(CreateOrderRequest req) {
        var order = Order.create(req);
        orderRepo.save(order);
        paymentGateway.charge(order.paymentDetails());
        events.publish(new OrderPlacedEvent(order.id()));
        return order;
    }
}
```

### JPA Repository with Custom Queries

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Derived query from method name
    List<Order> findByStatusAndCreatedAtAfter(OrderStatus status, Instant after);

    // JPQL for complex queries
    @Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.customer.id = :customerId")
    List<Order> findWithItemsByCustomerId(@Param("customerId") Long customerId);

    // Native query for reporting
    @Query(value = "SELECT status, COUNT(*) as cnt FROM orders GROUP BY status",
           nativeQuery = true)
    List<Object[]> countByStatus();
}
```

### REST Controller with Validation

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request) {
        Order order = orderService.placeOrder(request);
        return OrderResponse.from(order);
    }

    @GetMapping("/{id}")
    public OrderResponse getById(@PathVariable Long id) {
        return orderService.findById(id)
            .map(OrderResponse::from)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
```

### Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleValidation(ConstraintViolationException ex) {
        var problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Validation Failed");
        problem.setProperty("violations", ex.getConstraintViolations().stream()
            .map(v -> Map.of("field", v.getPropertyPath().toString(), "message", v.getMessage()))
            .toList());
        return problem;
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ProblemDetail handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Internal error");
    }
}
```

### AOP for Cross-Cutting Concerns

```java
@Aspect
@Component
public class LoggingAspect {

    @Around("@annotation(Logged)")
    public Object logExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        String method = joinPoint.getSignature().toShortString();
        log.info("Entering {}", method);
        long start = System.nanoTime();
        try {
            Object result = joinPoint.proceed();
            log.info("Exiting {} in {}ms", method, (System.nanoTime() - start) / 1_000_000);
            return result;
        } catch (Throwable ex) {
            log.error("Exception in {}: {}", method, ex.getMessage());
            throw ex;
        }
    }
}
```

### Security Configuration (Spring Security 6+)

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .build();
    }
}
```

## Best Practices

- Use constructor injection exclusively — avoid `@Autowired` on fields
- Use `@Transactional` at the service layer, not the repository or controller
- Return `ProblemDetail` (RFC 7807) from exception handlers for consistent error responses
- Use Spring profiles (`@Profile`) for environment-specific beans
- Enable Actuator health, metrics, and info endpoints for production observability
- Use `@ConfigurationProperties` for type-safe external configuration

## Anti-patterns

- Field injection with `@Autowired` — untestable, hides dependencies
- Business logic in controllers — keep controllers thin, delegate to services
- Catching exceptions in every controller method — use `@RestControllerAdvice`
- `@Transactional` on private methods — Spring proxies can't intercept them
- Exposing JPA entities directly in API responses — use DTOs/records

## Testing Strategy

- Use `@SpringBootTest` for integration tests with full context
- Use `@WebMvcTest` for controller-only tests with `MockMvc`
- Use `@DataJpaTest` for repository tests with an in-memory DB
- Mock service dependencies with `@MockBean`
- Use Testcontainers for tests against real databases and message brokers


## Related

- **Agents**: [java-reviewer](../../agents/java-reviewer.md), [java-build-resolver](../../agents/java-build-resolver.md)
- **Rules**: [java/spring](../../rules/java/spring.md), [java/coding-style](../../rules/java/coding-style.md)
- **Commands**: [/java-review](../../commands/java-review.md), [/java-build](../../commands/java-build.md)
