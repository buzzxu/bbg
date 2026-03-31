# /java-test

## Description
Java-specific TDD workflow using JUnit 5 with AssertJ assertions, Mockito mocks, and parameterized tests. Enforces RED-GREEN-IMPROVE cycle with Java idioms.

## Usage
```
/java-test "class or behavior to test"
/java-test "ConfigParser should handle missing fields"
```

## Process
1. **Understand behavior** — Clarify the class or behavior under test
2. **RED phase** — Write a failing test:
   - Create test at `src/test/java/<package>/<Class>Test.java`
   - Use `@Test` with `@DisplayName` for readable descriptions
   - Use AssertJ `assertThat()` for fluent assertions
   - Run `mvn test -pl <module>` or `gradle test` to confirm failure
3. **GREEN phase** — Implement minimum code to pass:
   - No extra logic beyond what tests require
   - Run `mvn test -pl <module>` or `gradle test` to confirm pass
4. **IMPROVE phase** — Refactor test and implementation:
   - Use `@BeforeEach` for shared setup
   - Use `@MockBean` or `@Mock` with `@ExtendWith(MockitoExtension.class)`
   - Use `@ParameterizedTest` with `@ValueSource` or `@CsvSource` for data-driven tests
   - Run `mvn test -pl <module> -Djacoco` to check coverage
5. **Repeat** — Add more test cases for additional behaviors

## Output
After each cycle:
- Test class with all test methods
- Implementation code
- `mvn test` or `gradle test` output at each phase
- Coverage summary

## Rules
- Always use `@DisplayName` for human-readable test descriptions
- Use AssertJ over JUnit assertions for better readability and error messages
- Use `@ExtendWith(MockitoExtension.class)` for Mockito integration
- Test exception cases with `assertThatThrownBy()` from AssertJ
- Use `@ParameterizedTest` for multiple input scenarios over duplicated tests
- Keep test classes mirroring source package structure
- Use `@Nested` classes to group related test scenarios

## Examples
```
/java-test "Handler should return 404 for unknown routes"
/java-test "ConfigParser handles empty YAML gracefully"
/java-test "Cache expires entries after TTL"
```

## Related

- **Agents**: [java-reviewer](../agents/java-reviewer.md)
- **Skills**: [springboot-testing](../skills/springboot-testing/SKILL.md), [tdd-workflow](../skills/tdd-workflow/SKILL.md)
- **Rules**: [testing](../rules/java/testing.md)
