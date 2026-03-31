# Coding Style: PHP

PHP-specific coding style rules for modern PHP (8.1+).

## Mandatory

- Declare `declare(strict_types=1)` at the top of every PHP file
- Follow PSR-12 coding standard — enforce with `php-cs-fixer` or `phpcs` in CI
- Use typed properties, parameters, and return types on all functions and methods
- Use `enum` (backed enums) instead of class constants for fixed sets of values
- Use `readonly` properties for immutable data — prefer `readonly class` for DTOs (PHP 8.2+)
- Use `match` expressions over `switch` — `match` is an expression and uses strict comparison
- Use named arguments for functions with boolean flags or multiple optional parameters
- Run `phpstan` or `psalm` at maximum level in CI — fix all reported issues

## Recommended

- Use `Fibers` or async libraries (ReactPHP, Amp) for concurrent I/O operations
- Use first-class callable syntax: `$fn = strlen(...)` instead of `'strlen'` strings
- Use union types and intersection types for precise type declarations
- Use constructor promotion: `public function __construct(private readonly string $name)`
- Use null-safe operator: `$user?->address?->city` instead of nested null checks
- Use `array_map`, `array_filter` with arrow functions for collection transforms
- Prefer value objects over associative arrays for structured data
- Use PHP attributes (`#[Route('/api')]`) instead of docblock annotations
- Use Composer autoloading exclusively — never `require` or `include` manually

## Forbidden

- Files without `declare(strict_types=1)` — strict types prevent silent type coercion
- `mixed` type as a return type without justification — be as specific as possible
- `@` error suppression operator — handle errors explicitly
- `extract()` — it creates variables from array keys, making code unpredictable
- `eval()` or `create_function()` — never execute dynamic strings as code
- `global` keyword — use dependency injection or function parameters instead
- Dynamic properties on classes (deprecated in PHP 8.2) — declare all properties explicitly

## Examples

```php
<?php
declare(strict_types=1);

// Good: Backed enum
enum OrderStatus: string {
    case Pending = 'pending';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
}

// Good: Readonly class with constructor promotion
readonly class UserDTO {
    public function __construct(
        public string $name,
        public string $email,
        public OrderStatus $status = OrderStatus::Pending,
    ) {}
}

// Good: Match expression
$label = match($status) {
    OrderStatus::Pending => 'Awaiting shipment',
    OrderStatus::Shipped => 'On the way',
    OrderStatus::Delivered => 'Arrived',
};

// Bad: Switch with type coercion
switch($status) {
    case 'pending': $label = 'Awaiting'; break;
    default: $label = 'Unknown';
}

// Good: Named arguments
$response = sendEmail(to: $user->email, subject: 'Welcome', html: true);

// Bad: Positional booleans
$response = sendEmail($user->email, 'Welcome', true, false, true);
```
