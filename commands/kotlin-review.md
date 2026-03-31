# /kotlin-review

## Description
Kotlin/Android-specific code review focusing on null safety, coroutines, Jetpack components, and Kotlin idioms.

## Usage
```
/kotlin-review [file or directory]
/kotlin-review app/src/main/java/com/example/viewmodel/
/kotlin-review app/src/main/
```

## Process
1. **Null safety** — Check for `!!` operator abuse, proper nullable type handling, safe calls
2. **Coroutines** — Verify structured concurrency, proper scope usage, cancellation handling
3. **Kotlin idioms** — Ensure use of data classes, sealed classes, extension functions, scope functions
4. **Android lifecycle** — Check ViewModel usage, LiveData/Flow patterns, lifecycle awareness
5. **Dependency injection** — Verify Hilt/Dagger usage, proper scoping, no manual DI
6. **Resource management** — Check for context leaks, proper resource cleanup, memory management
7. **Compose** — If using Jetpack Compose: recomposition, state hoisting, side effects
8. **Testing** — Verify coroutine test usage, MockK patterns, UI testing with Compose rules

## Output
Kotlin/Android-specific findings:
- Null safety violations (!! usage, platform type issues)
- Coroutine scope and cancellation problems
- Lifecycle and memory leak risks
- Compose recomposition issues
- Testing gaps and recommendations
- Overall Kotlin code health score

## Rules
- `!!` (non-null assertion) must be justified — prefer safe calls or `require()`
- Coroutines must use `viewModelScope`, `lifecycleScope`, or supervised scope
- Never store Activity/Fragment references in ViewModels
- Use `StateFlow` over `LiveData` for new code
- Check `build.gradle.kts` for dependency version consistency
- Verify ProGuard/R8 rules cover all serialized classes

## Examples
```
/kotlin-review app/src/main/java/com/example/
/kotlin-review app/src/main/java/com/example/viewmodel/MainViewModel.kt
/kotlin-review feature/auth/src/main/
```
