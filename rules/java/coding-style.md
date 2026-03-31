# Coding Style: Java

Java-specific coding style rules for modern Java (17+).

## Mandatory

- Use `record` types for immutable data carriers — they replace boilerplate POJOs
- Use `sealed` classes and interfaces to restrict type hierarchies — enable exhaustive matching
- Use pattern matching with `instanceof`: `if (obj instanceof String s)` — no explicit casts
- Use `Optional` for return types that may be absent — never return `null` from public methods
- Use `var` for local variables when the type is obvious from the right-hand side
- Use streams for collection transformations — prefer declarative over imperative loops
- Follow the module system (`module-info.java`) for library projects — control exports explicitly
- Use text blocks (`"""`) for multi-line strings — SQL, JSON, HTML templates

## Recommended

- Use `switch` expressions with pattern matching (Java 21+) for exhaustive type handling
- Prefer `List.of()`, `Map.of()`, `Set.of()` for immutable collections — avoid `Arrays.asList()`
- Use `String.formatted()` or `MessageFormat` over string concatenation in log messages
- Use `CompletableFuture` for async operations; virtual threads (Java 21+) for simple concurrency
- Prefer composition with interfaces over abstract class inheritance
- Use `@Serial` annotation on `serialVersionUID` and serialization methods
- Keep methods under 50 lines; classes under 300 lines
- Use `Objects.requireNonNull()` for fail-fast null checks in constructors

## Forbidden

- Returning `null` from public methods — use `Optional<T>` or throw a domain exception
- Raw types: `List` instead of `List<String>` — always use generic type parameters
- Mutable static fields — use dependency injection for shared state
- `catch (Exception e) {}` — never swallow exceptions silently; log or rethrow
- Checked exceptions in public APIs of new code — use unchecked (runtime) exceptions
- `java.util.Date` and `Calendar` — use `java.time` API exclusively
- Wildcard imports (`import java.util.*`) — import each class explicitly
- `synchronized` on public methods — use `ReentrantLock` or concurrent collections

## Examples

```java
// Good: Record type
public record UserResponse(String id, String name, String email) {}

// Bad: Mutable POJO
public class UserResponse {
    private String id;
    public void setId(String id) { this.id = id; }
    public String getId() { return id; }
}

// Good: Pattern matching switch
String describe(Shape shape) {
    return switch (shape) {
        case Circle c -> "Circle with radius " + c.radius();
        case Rectangle r -> "Rectangle %dx%d".formatted(r.width(), r.height());
    };
}

// Good: Optional return
public Optional<User> findById(String id) {
    return Optional.ofNullable(userMap.get(id));
}

// Bad: Null return
public User findById(String id) {
    return userMap.get(id);  // May return null
}
```
