---
name: laravel-testing
category: php
description: Laravel testing including feature tests, database testing, mocking, factories, and HTTP tests
---

# Laravel Testing

## Overview

Use this skill when writing or reviewing tests for Laravel applications. These patterns cover PHPUnit/Pest integration, HTTP testing, database assertions, factory usage, mocking services, and queue/event testing.

## Key Patterns

### Feature Tests (HTTP Tests)

```php
class OrderControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_order(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['price' => 29.99]);

        $response = $this->actingAs($user)
            ->postJson('/api/orders', [
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 2],
                ],
                'shipping_address' => '123 Main St',
            ]);

        $response
            ->assertStatus(201)
            ->assertJsonStructure(['id', 'status', 'total', 'items'])
            ->assertJson(['status' => 'pending', 'total' => '59.98']);

        $this->assertDatabaseHas('orders', [
            'customer_id' => $user->id,
            'status' => 'pending',
        ]);
    }

    public function test_unauthenticated_user_gets_401(): void
    {
        $this->postJson('/api/orders', ['items' => []])
            ->assertStatus(401);
    }

    public function test_validation_rejects_empty_items(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/orders', ['items' => [], 'shipping_address' => '123 Main St'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items']);
    }
}
```

### Model Factories

```php
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        return [
            'customer_id' => User::factory(),
            'status' => OrderStatus::Pending,
            'total' => $this->faker->randomFloat(2, 10, 500),
            'shipping_address' => $this->faker->address(),
        ];
    }

    public function confirmed(): static
    {
        return $this->state(['status' => OrderStatus::Confirmed]);
    }

    public function withItems(int $count = 3): static
    {
        return $this->has(OrderItem::factory()->count($count));
    }
}

// Usage in tests
$order = Order::factory()->confirmed()->withItems(5)->create();
$orders = Order::factory()->count(10)->for($user)->create();
```

### Mocking External Services

```php
public function test_payment_processing(): void
{
    $gateway = $this->mock(PaymentGateway::class);
    $gateway->shouldReceive('charge')
        ->once()
        ->with(59.98, 'card_123')
        ->andReturn(new PaymentResult(success: true, transactionId: 'tx_456'));

    $order = Order::factory()->create(['total' => 59.98]);

    $this->actingAs($order->customer)
        ->postJson("/api/orders/{$order->id}/pay", ['payment_method' => 'card_123'])
        ->assertStatus(200)
        ->assertJson(['status' => 'paid']);
}

// Spy for verifying interactions without stubbing
public function test_notification_sent_on_order(): void
{
    Notification::fake();

    $user = User::factory()->create();
    $order = Order::factory()->for($user)->create();

    OrderPlaced::dispatch($order);

    Notification::assertSentTo($user, OrderConfirmationNotification::class);
}
```

### Queue and Event Testing

```php
public function test_order_dispatches_payment_job(): void
{
    Queue::fake();

    $order = Order::factory()->create();

    $this->actingAs($order->customer)
        ->postJson("/api/orders/{$order->id}/confirm")
        ->assertStatus(200);

    Queue::assertPushed(ProcessPayment::class, function ($job) use ($order) {
        return $job->order->id === $order->id;
    });
}

public function test_events_fired_on_order_creation(): void
{
    Event::fake([OrderPlaced::class]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/orders', $this->validOrderPayload())
        ->assertStatus(201);

    Event::assertDispatched(OrderPlaced::class, function ($event) use ($user) {
        return $event->order->customer_id === $user->id;
    });
}
```

### Database Testing Patterns

```php
public function test_soft_delete_excludes_from_queries(): void
{
    $order = Order::factory()->create();
    $order->delete();

    $this->assertSoftDeleted('orders', ['id' => $order->id]);
    $this->assertDatabaseHas('orders', ['id' => $order->id]); // still in DB
    $this->assertCount(0, Order::all()); // excluded from default query
    $this->assertCount(1, Order::withTrashed()->get());
}

public function test_query_scopes(): void
{
    Order::factory()->count(3)->confirmed()->create();
    Order::factory()->count(2)->create(['status' => OrderStatus::Pending]);

    $confirmed = Order::confirmed()->get();
    $this->assertCount(3, $confirmed);
    $confirmed->each(fn ($order) =>
        $this->assertEquals(OrderStatus::Confirmed, $order->status)
    );
}
```

### Pest Syntax (Alternative to PHPUnit)

```php
test('user can view their orders', function () {
    $user = User::factory()->has(Order::factory()->count(3))->create();

    $this->actingAs($user)
        ->getJson('/api/orders')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

test('unauthorized users cannot cancel orders', function () {
    $order = Order::factory()->create();
    $otherUser = User::factory()->create();

    $this->actingAs($otherUser)
        ->postJson("/api/orders/{$order->id}/cancel")
        ->assertForbidden();
});
```

## Best Practices

- Use `RefreshDatabase` trait for isolation — each test starts with clean state
- Use factories for all test data — never insert raw DB records
- Use `assertJson` / `assertJsonStructure` for API response validation
- Test validation separately — one test per validation rule group
- Use `actingAs` for authentication — never manually set tokens in tests
- Keep test methods focused — one assertion concept per test

## Anti-patterns

- Seeding the database globally for tests — use factories in each test
- Testing framework internals (middleware registration, route binding)
- Sharing state between test methods via class properties
- Over-mocking — if you mock the model, you're not testing anything useful
- Using `$this->withoutExceptionHandling()` in every test — masks real behavior

## Testing Strategy

- Structure: `tests/Feature/` for HTTP tests, `tests/Unit/` for isolated logic
- Run `php artisan test --parallel` for faster execution
- Use `--coverage --min=80` to enforce coverage threshold
- Test jobs and listeners both in isolation and through feature tests
- Use `assertDatabaseCount` to verify no unexpected records are created


## Related

- **Rules**: [php/testing](../../rules/php/testing.md)
