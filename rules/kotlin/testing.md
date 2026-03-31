# Testing: Kotlin

Kotlin-specific testing rules for JVM and Android projects.

## Mandatory

- Use JUnit 5 for JVM projects — JUnit 4 only where Android testing requires it
- Use MockK over Mockito for Kotlin code — it handles coroutines, extension functions, and objects natively
- Use `Turbine` for testing Kotlin Flows — it provides deterministic emission and completion assertions
- Verify coroutine cancellation behavior — test that structured concurrency works correctly
- Use `runTest` (from `kotlinx-coroutines-test`) for coroutine tests — it auto-advances virtual time
- Test sealed class handling exhaustively — verify all branches of `when` expressions
- Name test functions descriptively with backticks: `` `should return empty list when no users found` ``

## Recommended

- Use Compose testing APIs (`composeTestRule`, `onNodeWithText`) for Jetpack Compose UI tests
- Use Robolectric for Android unit tests that need framework APIs without a device
- Use `kotest` for property-based testing and rich assertion DSL as an alternative to JUnit
- Use `coEvery`/`coVerify` from MockK for mocking suspend functions
- Create test fixtures with factory functions: `fun createUser(name: String = "Alice"): User`
- Use `TestDispatcher` to control coroutine execution in tests — never use `Dispatchers.IO` directly
- Use `@Nested` inner classes to group related test scenarios
- Test ViewModel state emissions as a complete sequence, not individual snapshots

## Forbidden

- `Thread.sleep()` or `delay()` in tests — use `runTest` with `advanceTimeBy()` / `advanceUntilIdle()`
- `Dispatchers.Main` in unit tests without `Dispatchers.setMain(testDispatcher)` — it will crash
- Testing implementation details of coroutine scheduling — test observable behavior
- Mocking data classes — create real instances with test values instead
- `@Ignore` without a reason string and issue reference
- Using real network or database in unit tests — use fakes or MockK

## Examples

```kotlin
// Good: Flow testing with Turbine
@Test
fun `should emit loading then success`() = runTest {
    val viewModel = UserViewModel(FakeUserRepository())
    viewModel.users.test {
        assertThat(awaitItem()).isEqualTo(UiState.Loading)
        assertThat(awaitItem()).isEqualTo(UiState.Success(testUsers))
        cancelAndIgnoreRemainingEvents()
    }
}

// Good: MockK with coroutines
@Test
fun `should fetch user from repository`() = runTest {
    val repository = mockk<UserRepository>()
    coEvery { repository.findById("1") } returns testUser

    val service = UserService(repository)
    val result = service.getUser("1")

    assertThat(result).isEqualTo(testUser)
    coVerify(exactly = 1) { repository.findById("1") }
}

// Good: Compose UI test
@Test
fun `should display user name`() {
    composeTestRule.setContent { UserCard(user = testUser) }
    composeTestRule.onNodeWithText("Alice").assertIsDisplayed()
}

// Bad: Sleep-based timing
@Test
fun test() {
    viewModel.loadUsers()
    Thread.sleep(1000)
    assertEquals(expected, viewModel.users.value)
}
```
