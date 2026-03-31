# Testing: PHP

PHP-specific testing rules using PHPUnit and Pest.

## Mandatory

- Use PHPUnit 10+ or Pest as the test framework — maintain consistent choice per project
- Name test methods descriptively: `test_it_rejects_expired_tokens()` or Pest's `it('rejects expired tokens')`
- Use data providers (`@dataProvider` or Pest `with()`) for parameterized tests
- Mock only at system boundaries (HTTP clients, databases, filesystems) — not internal classes
- Use database transactions in feature tests — roll back after each test for isolation
- Run `phpunit --coverage-text --coverage-clover` in CI — enforce minimum 80% coverage
- Assert specific exception types: `$this->expectException(InvalidArgumentException::class)`

## Recommended

- Use Pest for new projects — it provides a cleaner syntax and better DX over PHPUnit
- Use factories (Laravel `factory()` or custom builders) for test data construction
- Use `Mockery` for complex mocking scenarios — it has a more expressive API than PHPUnit mocks
- Use `RefreshDatabase` trait (Laravel) or equivalent for integration tests with database state
- Use `Http::fake()` (Laravel) or `MockHandler` (Guzzle) for HTTP client testing
- Use `assertDatabaseHas` / `assertDatabaseMissing` for verifying persistence side effects
- Group tests with `describe` blocks in Pest for better organization
- Use `faker` for generating realistic test data — don't hardcode test values
- Profile slow tests with `--log-junit` and address tests exceeding 1 second

## Forbidden

- `sleep()` in tests — use mocked clocks or Carbon's `setTestNow()`
- Tests that depend on execution order — each test must pass independently
- `@depends` annotation chaining tests together — create independent test data
- Mocking the class under test — only mock its collaborators
- `@group skip` or `markTestSkipped()` without a reason and issue reference
- Raw SQL assertions — use the ORM's assertion helpers for database state

## Examples

```php
<?php
// Good: Pest with data provider
it('validates email format', function (string $email, bool $valid) {
    expect(isValidEmail($email))->toBe($valid);
})->with([
    ['alice@example.com', true],
    ['not-an-email', false],
    ['@missing-local.com', false],
]);

// Good: PHPUnit with factory
public function test_it_creates_order_for_authenticated_user(): void
{
    $user = User::factory()->create();
    $product = Product::factory()->create(['price' => 1000]);

    $this->actingAs($user)
        ->postJson('/api/orders', ['product_id' => $product->id])
        ->assertCreated()
        ->assertJsonPath('data.total', 1000);

    $this->assertDatabaseHas('orders', [
        'user_id' => $user->id,
        'product_id' => $product->id,
    ]);
}

// Good: HTTP mocking
it('handles API timeout gracefully', function () {
    Http::fake(['api.example.com/*' => Http::response(null, 504)]);

    expect(fn() => fetchExternalData())
        ->toThrow(ServiceUnavailableException::class);
});

// Bad: No assertions
public function test_user(): void
{
    $user = new User('Alice');
    $user->save();  // What's being tested?
}
```
