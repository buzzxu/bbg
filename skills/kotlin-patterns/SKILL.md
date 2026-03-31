---
name: kotlin-patterns
category: kotlin
description: Kotlin idioms including coroutines, flows, sealed classes, inline classes, delegation, and scope functions
---

# Kotlin Patterns

## Overview

Use this skill when writing or reviewing Kotlin code. These patterns leverage Kotlin's concise syntax, null safety, coroutines for async programming, and expressive type system.

## Key Patterns

### Sealed Classes for Exhaustive State

```kotlin
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Failure(val error: Throwable) : Result<Nothing>()
    data object Loading : Result<Nothing>()
}

fun <T> Result<T>.getOrNull(): T? = when (this) {
    is Result.Success -> data
    is Result.Failure -> null
    is Result.Loading -> null
    // No `else` needed — compiler ensures exhaustiveness
}
```

### Coroutines and Structured Concurrency

```kotlin
import kotlinx.coroutines.*

suspend fun fetchUserProfile(userId: String): Profile = coroutineScope {
    val userDeferred = async { userService.getUser(userId) }
    val ordersDeferred = async { orderService.getOrders(userId) }

    // Both run concurrently; if either fails, the other is cancelled
    val user = userDeferred.await()
    val orders = ordersDeferred.await()
    Profile(user, orders)
}

// Cancellation-safe resource management
suspend fun processFile(path: String) {
    withContext(Dispatchers.IO) {
        File(path).bufferedReader().use { reader ->
            reader.lineSequence().forEach { line ->
                ensureActive() // check for cancellation
                process(line)
            }
        }
    }
}
```

### Flows for Reactive Streams

```kotlin
import kotlinx.coroutines.flow.*

fun observePrices(symbol: String): Flow<Price> = flow {
    while (true) {
        val price = api.getPrice(symbol)
        emit(price)
        delay(1_000)
    }
}.distinctUntilChanged()
 .catch { e -> emit(Price.error(e.message)) }

// Collecting with lifecycle awareness
viewModelScope.launch {
    observePrices("AAPL")
        .map { price -> formatCurrency(price.value) }
        .collect { formatted -> _uiState.value = formatted }
}
```

### Value Classes (Inline Classes)

```kotlin
@JvmInline
value class UserId(val value: String) {
    init { require(value.isNotBlank()) { "UserId must not be blank" } }
}

@JvmInline
value class Email(val value: String) {
    init { require("@" in value) { "Invalid email: $value" } }
}

// Type safety at compile time, zero runtime overhead
fun getUser(id: UserId): User = repository.findById(id.value)
// getUser(Email("x")) — compile error, even though both wrap String
```

### Delegation

```kotlin
// Class delegation
interface Logger {
    fun log(message: String)
}

class ConsoleLogger : Logger {
    override fun log(message: String) = println("[LOG] $message")
}

class UserService(logger: Logger) : Logger by logger {
    fun createUser(name: String) {
        log("Creating user: $name") // delegated to ConsoleLogger
    }
}

// Property delegation
class Preferences(private val prefs: SharedPreferences) {
    var theme: String by prefs.string(default = "light")
    var fontSize: Int by prefs.int(default = 14)
}
```

### Scope Functions

```kotlin
// `let` — transform nullable or scoped value
val length = name?.let { it.trim().length } ?: 0

// `apply` — configure an object (returns the object)
val user = User().apply {
    this.name = "Alice"
    this.email = "alice@example.com"
}

// `run` — execute a block and return result
val result = connection.run {
    prepareStatement(sql)
    executeQuery()
    mapToList()
}

// `also` — side effects (returns the object)
val sorted = list.sorted().also { logger.debug("Sorted: $it") }

// `with` — operate on an object without extension
val csv = with(StringBuilder()) {
    appendLine("name,age")
    users.forEach { appendLine("${it.name},${it.age}") }
    toString()
}
```

## Best Practices

- Use `sealed class`/`sealed interface` for closed type hierarchies with exhaustive `when`
- Use `value class` for type-safe wrappers around primitives — zero allocation overhead
- Prefer `Flow` over callbacks for reactive data streams
- Use `coroutineScope` for structured concurrency — never use `GlobalScope`
- Use `data class` for DTOs; use `sealed class` for state machines
- Prefer extension functions over utility classes for domain operations

## Anti-patterns

- Using `GlobalScope.launch` — leaks coroutines without lifecycle control
- Using `!!` (non-null assertion) — prefer `?.let {}`, `?:`, or `requireNotNull()`
- Nested scope functions (`foo.let { it.also { ... }.run { ... } }`) — hard to read
- Mutable data classes — defeats the purpose of value equality
- Using exceptions for control flow — use sealed classes for expected outcomes

## Testing Strategy

- Use `kotlinx-coroutines-test` with `runTest` for coroutine testing
- Use `Turbine` library for Flow assertion (`flow.test { ... }`)
- Use MockK for mocking Kotlin-specific features (coroutines, extension functions)
- Test sealed class hierarchies by covering every subclass in `when` expressions
- Use `@JvmStatic` `@Parameterized` or JUnit 5 `@ParameterizedTest` for data-driven tests


## Related

- **Agents**: [kotlin-reviewer](../../agents/kotlin-reviewer.md)
- **Rules**: [kotlin/coding-style](../../rules/kotlin/coding-style.md), [kotlin/testing](../../rules/kotlin/testing.md)
- **Commands**: [/kotlin-review](../../commands/kotlin-review.md)
