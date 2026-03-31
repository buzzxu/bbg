# Coding Style: Kotlin

Kotlin-specific coding style rules layered on top of common rules.

## Mandatory

- Use Kotlin's null safety system — never use `!!` except in tests with clear context
- Use `val` by default — only use `var` when mutation is absolutely necessary
- Use `data class` for value types — they provide `equals`, `hashCode`, `copy`, and `toString`
- Use `sealed class` or `sealed interface` for restricted type hierarchies with exhaustive `when`
- Use coroutines for async operations — never use raw threads or `Thread.sleep()` in application code
- Use `when` expressions exhaustively — the compiler enforces all branches for sealed types
- Follow Kotlin coding conventions and run `ktlint` or `detekt` in CI

## Recommended

- Use `inline class` (value class) for type-safe wrappers with zero runtime overhead
- Use scope functions idiomatically: `let` for null checks, `apply` for configuration, `run` for scoping
- Prefer `sequence {}` over `List` operations when chaining multiple transformations on large collections
- Use delegation with `by` for interface implementation and property behavior
- Use `require()` and `check()` for precondition validation — they throw `IllegalArgumentException`/`IllegalStateException`
- Prefer extension functions over utility classes — `fun String.toSlug(): String`
- Use named arguments for functions with multiple parameters of the same type
- Use `object` declarations for singletons — prefer dependency injection for testability
- Use `typealias` for complex generic types to improve readability

## Forbidden

- `!!` operator in production code — use `?.let {}`, `?:`, or `requireNotNull()` instead
- `var` when `val` suffices — mutability must be justified
- Platform types (`T!`) leaking into Kotlin APIs — add explicit nullability annotations on Java boundaries
- `lateinit` for properties that can use lazy initialization or constructor injection
- Throwing generic `Exception` — use specific exception types or sealed result types
- `companion object` used as a dumping ground — keep them focused on factory methods
- `it` in nested lambdas — use named parameters when lambdas are nested

## Examples

```kotlin
// Good: Sealed interface with exhaustive when
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Failure(val error: AppError) : Result<Nothing>
}

fun <T> Result<T>.getOrThrow(): T = when (this) {
    is Result.Success -> data
    is Result.Failure -> throw error.toException()
}

// Good: Inline class for type safety
@JvmInline
value class UserId(val value: String)

@JvmInline
value class OrderId(val value: String)

fun processOrder(userId: UserId, orderId: OrderId) { ... }

// Bad: Stringly typed
fun processOrder(userId: String, orderId: String) { ... }

// Good: Null-safe chain
user?.address?.city?.let { println("City: $it") }

// Bad: Force unwrap
println("City: ${user!!.address!!.city!!}")
```
