---
name: laravel-patterns
category: php
description: Laravel patterns including Eloquent, migrations, middleware, queues, events, service providers, and policies
---

# Laravel Patterns

## Overview

Use this skill when building or reviewing Laravel applications. These patterns cover Eloquent model design, request lifecycle, authorization, asynchronous processing, and service architecture.

## Key Patterns

### Eloquent Model with Relationships and Scopes

```php
class Order extends Model
{
    protected $fillable = ['customer_id', 'status', 'total'];

    protected $casts = [
        'total' => 'decimal:2',
        'status' => OrderStatus::class, // Backed enum cast
        'metadata' => 'array',
    ];

    // Relationships
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    // Query scopes
    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', OrderStatus::Confirmed);
    }

    public function scopeRecent(Builder $query, int $days = 30): Builder
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }
}

// Usage: Order::confirmed()->recent(7)->with('customer')->paginate(20);
```

### Migrations

```php
return new class extends Migration {
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending')->index();
            $table->decimal('total', 10, 2);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
```

### Form Request Validation

```php
class CreateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Order::class);
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'shipping_address' => ['required', 'string', 'max:500'],
        ];
    }
}
```

### Middleware

```php
class EnsureTeamMember
{
    public function handle(Request $request, Closure $next): Response
    {
        $team = $request->route('team');

        if (! $request->user()->belongsToTeam($team)) {
            abort(403, 'You are not a member of this team.');
        }

        return $next($request);
    }
}

// Register: Route::middleware(EnsureTeamMember::class)->group(function () { ... });
```

### Events and Listeners

```php
// Event
class OrderPlaced
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Order $order) {}
}

// Listener
class SendOrderConfirmation implements ShouldQueue
{
    public function handle(OrderPlaced $event): void
    {
        Mail::to($event->order->customer->email)
            ->send(new OrderConfirmationMail($event->order));
    }
}

// Dispatch
OrderPlaced::dispatch($order);
```

### Queued Jobs

```php
class ProcessPayment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(private readonly Order $order) {}

    public function handle(PaymentGateway $gateway): void
    {
        $result = $gateway->charge($this->order->total, $this->order->payment_method);

        if ($result->failed()) {
            throw new PaymentFailedException($result->error);
        }

        $this->order->update(['status' => OrderStatus::Paid]);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('Payment failed', ['order' => $this->order->id, 'error' => $exception->getMessage()]);
    }
}
```

### Policies for Authorization

```php
class OrderPolicy
{
    public function view(User $user, Order $order): bool
    {
        return $user->id === $order->customer_id || $user->isAdmin();
    }

    public function cancel(User $user, Order $order): bool
    {
        return $user->id === $order->customer_id
            && $order->status === OrderStatus::Pending;
    }
}

// Controller: $this->authorize('cancel', $order);
```

## Best Practices

- Use `$casts` for type-safe attribute access — especially enums and JSON
- Use query scopes for reusable query logic — chain them fluently
- Use Form Requests for validation — keep controllers thin
- Use events for decoupled side effects (emails, notifications, analytics)
- Use policies for authorization — never check permissions in Eloquent models
- Eager load relationships with `->with()` to prevent N+1 queries

## Anti-patterns

- Fat controllers — extract logic into actions, services, or jobs
- Mass assignment without `$fillable` — security vulnerability
- Using `DB::raw()` for queries the Eloquent builder can express
- Synchronous email/notification sending in request lifecycle — use queues
- N+1 queries — always eager load with `with()` or use `preventLazyLoading()`

## Testing Strategy

- Use `RefreshDatabase` trait for clean state between tests
- Use model factories for test data generation
- Test policies with `$this->assertTrue($user->can('cancel', $order))`
- Test queued jobs with `Queue::fake()` and `Queue::assertPushed()`
- Test events with `Event::fake()` and `Event::assertDispatched()`
