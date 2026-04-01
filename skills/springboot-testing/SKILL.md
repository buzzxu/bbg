---
name: springboot-testing
category: java
description: Spring Boot testing with @SpringBootTest, MockMvc, @DataJpaTest, Testcontainers, and WireMock
---

# Spring Boot Testing

## Overview

Use this skill when writing or reviewing tests for Spring Boot applications. These patterns cover the test slice annotations, MockMvc for HTTP testing, Testcontainers for real infrastructure, and WireMock for external service simulation.

## Key Patterns

### Controller Tests with @WebMvcTest

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Test
    void shouldReturnOrder() throws Exception {
        var order = new OrderResponse(1L, "CONFIRMED", BigDecimal.TEN);
        when(orderService.findById(1L)).thenReturn(Optional.of(order));

        mockMvc.perform(get("/api/v1/orders/1")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    void shouldReturn404WhenNotFound() throws Exception {
        when(orderService.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/orders/99"))
            .andExpect(status().isNotFound());
    }

    @Test
    void shouldValidateRequestBody() throws Exception {
        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"customerId": null, "items": []}
                    """))
            .andExpect(status().isBadRequest());
    }
}
```

### Repository Tests with @DataJpaTest

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Testcontainers
class OrderRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldFindOrdersByStatus() {
        orderRepository.save(Order.create("CONFIRMED"));
        orderRepository.save(Order.create("PENDING"));
        orderRepository.save(Order.create("CONFIRMED"));

        var confirmed = orderRepository.findByStatusAndCreatedAtAfter(
            OrderStatus.CONFIRMED, Instant.now().minus(1, ChronoUnit.HOURS));

        assertThat(confirmed).hasSize(2);
        assertThat(confirmed).allMatch(o -> o.getStatus() == OrderStatus.CONFIRMED);
    }
}
```

### Full Integration Test with @SpringBootTest

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldCreateAndRetrieveOrder() {
        var request = new CreateOrderRequest(1L, List.of(new ItemRequest("SKU-1", 2)));

        var createResponse = restTemplate.postForEntity("/api/v1/orders", request, OrderResponse.class);
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        Long orderId = createResponse.getBody().id();
        var getResponse = restTemplate.getForEntity("/api/v1/orders/" + orderId, OrderResponse.class);
        assertThat(getResponse.getBody().status()).isEqualTo("PENDING");
    }
}
```

### External Service Mocking with WireMock

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@WireMockTest(httpPort = 9090)
class PaymentServiceTest {

    @Test
    void shouldHandlePaymentSuccess() {
        stubFor(post(urlPathEqualTo("/payments"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {"transactionId": "tx-123", "status": "SUCCESS"}
                    """)));

        var result = paymentService.charge(new PaymentRequest(BigDecimal.TEN, "USD"));
        assertThat(result.transactionId()).isEqualTo("tx-123");

        verify(postRequestedFor(urlPathEqualTo("/payments"))
            .withRequestBody(matchingJsonPath("$.amount", equalTo("10"))));
    }

    @Test
    void shouldRetryOnTimeout() {
        stubFor(post(urlPathEqualTo("/payments"))
            .inScenario("retry")
            .whenScenarioStateIs(STARTED)
            .willReturn(aResponse().withFixedDelay(5000))
            .willSetStateTo("second-attempt"));

        stubFor(post(urlPathEqualTo("/payments"))
            .inScenario("retry")
            .whenScenarioStateIs("second-attempt")
            .willReturn(aResponse().withStatus(200).withBody("{\"status\":\"SUCCESS\"}")));

        var result = paymentService.charge(new PaymentRequest(BigDecimal.TEN, "USD"));
        assertThat(result.status()).isEqualTo("SUCCESS");
    }
}
```

### Test Configuration Isolation

```java
@TestConfiguration
class TestSecurityConfig {
    @Bean
    public SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll()).build();
    }
}

// Use in tests
@SpringBootTest
@Import(TestSecurityConfig.class)
class AdminControllerTest { /* ... */ }
```

## Best Practices

- Use the narrowest test slice: `@WebMvcTest` > `@DataJpaTest` > `@SpringBootTest`
- Use Testcontainers for databases — avoid H2 for Postgres/MySQL-specific features
- Use WireMock for external HTTP dependencies — never call real services in tests
- Use `@DynamicPropertySource` to wire container ports into Spring config
- Use AssertJ over JUnit assertions for fluent, readable test code
- Share containers across test classes with `static` fields for speed

## Anti-patterns

- Using `@SpringBootTest` for every test — slow, loads unnecessary context
- Mocking repositories in service tests when `@DataJpaTest` tests the real query
- Using `@MockBean` everywhere — it dirties the context and forces reloading
- Testing Spring configuration instead of business logic
- Flaky tests from port conflicts — use random ports and dynamic properties

## Testing Strategy

- Unit tests: plain JUnit 5 + Mockito for service logic (no Spring context)
- Slice tests: `@WebMvcTest`, `@DataJpaTest` for framework integration
- Integration tests: `@SpringBootTest` + Testcontainers for end-to-end flows
- Contract tests: WireMock for external APIs, Spring Cloud Contract for internal
- Run fast unit tests on every push; integration tests in CI pipeline


## Related

- **Agents**: [java-reviewer](../../agents/java-reviewer.md)
- **Rules**: [java/testing](../../rules/java/testing.md)
- **Commands**: [/java-test](../../commands/java-test.md)
