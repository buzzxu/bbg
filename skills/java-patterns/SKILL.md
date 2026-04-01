---
name: java-patterns
category: java
description: Java idioms including records, sealed classes, pattern matching, streams, Optional, and virtual threads
---

# Java Patterns

## Overview

Use this skill when writing or reviewing modern Java (17+) code. These patterns leverage records, sealed hierarchies, pattern matching, and virtual threads for cleaner, more expressive code.

## Key Patterns

### Records — Immutable Data Carriers

```java
public record User(String id, String name, String email) {
    // Compact constructor for validation
    public User {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(name, "name must not be null");
        if (!email.contains("@")) throw new IllegalArgumentException("invalid email");
    }

    // Derived field
    public String displayName() {
        return name + " <" + email + ">";
    }
}

// Auto-generates: constructor, getters, equals, hashCode, toString
var user = new User("1", "Alice", "alice@example.com");
```

### Sealed Classes with Pattern Matching

```java
public sealed interface Shape permits Circle, Rectangle, Triangle {}
public record Circle(double radius) implements Shape {}
public record Rectangle(double width, double height) implements Shape {}
public record Triangle(double base, double height) implements Shape {}

// Exhaustive switch expression (Java 21+)
public static double area(Shape shape) {
    return switch (shape) {
        case Circle c -> Math.PI * c.radius() * c.radius();
        case Rectangle r -> r.width() * r.height();
        case Triangle t -> 0.5 * t.base() * t.height();
        // No default needed — compiler knows all cases are covered
    };
}
```

### Pattern Matching with Guards

```java
public static String describe(Object obj) {
    return switch (obj) {
        case Integer i when i < 0 -> "negative: " + i;
        case Integer i -> "positive: " + i;
        case String s when s.isBlank() -> "blank string";
        case String s -> "string: " + s;
        case null -> "null";
        default -> "unknown: " + obj.getClass().getSimpleName();
    };
}
```

### Streams — Declarative Data Pipelines

```java
// Collect, filter, transform
var activeEmails = users.stream()
    .filter(u -> u.isActive())
    .map(User::email)
    .sorted()
    .toList(); // unmodifiable list (Java 16+)

// Grouping
Map<String, List<User>> byDepartment = users.stream()
    .collect(Collectors.groupingBy(User::department));

// Reduce with accumulator
var totalRevenue = orders.stream()
    .map(Order::amount)
    .reduce(BigDecimal.ZERO, BigDecimal::add);
```

### Optional — Explicit Absence

```java
public Optional<User> findByEmail(String email) {
    return Optional.ofNullable(db.get(email));
}

// Chain operations without null checks
String name = findByEmail("alice@example.com")
    .map(User::name)
    .orElse("Unknown");

// Throw if absent
User user = findByEmail(email)
    .orElseThrow(() -> new NotFoundException("User not found: " + email));
```

### Virtual Threads (Java 21+)

```java
// Lightweight threads for I/O-bound work — millions can run concurrently
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<Response>> futures = urls.stream()
        .map(url -> executor.submit(() -> fetch(url)))
        .toList();

    List<Response> responses = futures.stream()
        .map(f -> {
            try { return f.get(); }
            catch (Exception e) { throw new RuntimeException(e); }
        })
        .toList();
}

// Structured concurrency (preview)
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var userTask = scope.fork(() -> fetchUser(id));
    var ordersTask = scope.fork(() -> fetchOrders(id));
    scope.join().throwIfFailed();
    return new Profile(userTask.get(), ordersTask.get());
}
```

## Best Practices

- Use records for DTOs, value objects, and event payloads — never mutable POJOs
- Prefer sealed interfaces over abstract classes for closed type hierarchies
- Use `switch` expressions (not statements) for exhaustive matching
- Return `Optional` from query methods; never pass `Optional` as a parameter
- Use virtual threads for I/O-bound work; keep platform threads for CPU-bound
- Prefer `List.of()`, `Map.of()` for unmodifiable collections

## Anti-patterns

- Using `null` as a return value when `Optional` communicates intent better
- Mutable records — records should always be immutable value types
- Using `instanceof` chains when sealed + pattern matching is available
- Calling `Optional.get()` without `isPresent()` — use `orElseThrow()` instead
- Creating platform threads for every request — use virtual threads or thread pools

## Testing Strategy

- Use JUnit 5 with `@ParameterizedTest` for data-driven tests
- Use AssertJ for fluent, readable assertions
- Test sealed hierarchies exhaustively — one test case per permitted subclass
- Use `CompletableFuture` testing utilities for async code assertions
- Run `NullAway` or `Checker Framework` for compile-time null safety


## Related

- **Agents**: [java-reviewer](../../agents/java-reviewer.md), [java-build-resolver](../../agents/java-build-resolver.md)
- **Rules**: [java/coding-style](../../rules/java/coding-style.md), [java/testing](../../rules/java/testing.md)
- **Commands**: [/java-review](../../commands/java-review.md), [/java-build](../../commands/java-build.md)
