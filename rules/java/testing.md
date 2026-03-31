# Testing: Java

Java-specific testing rules using JUnit 5 and modern testing libraries.

## Mandatory

- Use JUnit 5 (`org.junit.jupiter`) — never JUnit 4 annotations in new tests
- Use `@DisplayName` for human-readable test descriptions: `@DisplayName("should reject expired tokens")`
- Use AssertJ for all assertions — prefer `assertThat(result).isEqualTo(expected)` over JUnit asserts
- Use Mockito for mocking — annotate with `@Mock` and `@InjectMocks`, use `@ExtendWith(MockitoExtension.class)`
- Verify mock interactions only when the side effect is the behavior under test
- Use `@Nested` classes to group related test scenarios within a test class
- Clean up resources with `@AfterEach` — never rely on garbage collection for test cleanup

## Recommended

- Use `@ParameterizedTest` with `@CsvSource`, `@MethodSource`, or `@EnumSource` for data-driven tests
- Use Testcontainers for integration tests with databases, message queues, and external services
- Use `@SpringBootTest` sparingly — prefer slice tests (`@WebMvcTest`, `@DataJpaTest`) for speed
- Use ArchUnit to enforce architecture rules: layer dependencies, naming conventions, no cycles
- Use mutation testing with Pitest to validate test quality beyond line coverage
- Use `@TempDir` for filesystem tests — JUnit manages lifecycle automatically
- Use `Awaitility` for testing async behavior — never `Thread.sleep()`
- Use `@TestFactory` for dynamic test generation when the test cases are computed

## Forbidden

- `Thread.sleep()` in tests — use `Awaitility.await().atMost(5, SECONDS).until(...)`
- `@SpringBootTest` for unit tests — it loads the entire application context unnecessarily
- Mocking value objects, records, or data classes — only mock service dependencies
- `@Disabled` without a reason and issue reference in the annotation
- Assertions in `@BeforeEach` or `@AfterEach` — these are for setup and cleanup only
- Static mocking (`mockStatic`) as a regular practice — it indicates design problems

## Examples

```java
// Good: AssertJ + Nested + DisplayName
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock UserRepository repository;
    @InjectMocks UserService service;

    @Nested
    @DisplayName("findById")
    class FindById {
        @Test
        @DisplayName("should return user when found")
        void returnsUser() {
            when(repository.findById("1")).thenReturn(Optional.of(testUser()));
            var result = service.findById("1");
            assertThat(result).isPresent().hasValueSatisfying(u ->
                assertThat(u.name()).isEqualTo("Alice")
            );
        }

        @Test
        @DisplayName("should return empty when not found")
        void returnsEmpty() {
            when(repository.findById("99")).thenReturn(Optional.empty());
            assertThat(service.findById("99")).isEmpty();
        }
    }
}

// Good: Parameterized test
@ParameterizedTest
@CsvSource({"admin,true", "viewer,false", "editor,false"})
void canDelete_returnsExpected(String role, boolean expected) {
    assertThat(Permissions.canDelete(role)).isEqualTo(expected);
}
```
