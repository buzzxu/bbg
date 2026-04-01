---
name: cpp-patterns
category: cpp
description: Modern C++ (17/20/23) patterns including smart pointers, RAII, concepts, ranges, std::expected, and coroutines
---

# Modern C++ Patterns

## Overview

Use this skill when writing or reviewing modern C++ (C++17/20/23) code. These patterns emphasize memory safety through RAII and smart pointers, expressive APIs with concepts and ranges, and structured error handling.

## Key Patterns

### RAII and Smart Pointers

```cpp
#include <memory>

class Connection {
public:
    static std::unique_ptr<Connection> create(const std::string& url) {
        auto conn = std::unique_ptr<Connection>(new Connection(url));
        conn->connect();
        return conn;
    }

    ~Connection() { disconnect(); }  // RAII: cleanup on destruction

    // Non-copyable, movable
    Connection(const Connection&) = delete;
    Connection& operator=(const Connection&) = delete;
    Connection(Connection&&) noexcept = default;
    Connection& operator=(Connection&&) noexcept = default;

    void execute(const std::string& query);

private:
    explicit Connection(const std::string& url) : url_(url) {}
    void connect();
    void disconnect();
    std::string url_;
};

// Usage — no manual delete, exception-safe
void process() {
    auto conn = Connection::create("postgres://localhost/db");
    conn->execute("SELECT 1");  // if this throws, conn is still cleaned up
}

// Shared ownership when needed
auto shared = std::make_shared<Config>();
auto observer = std::weak_ptr<Config>(shared);  // non-owning reference
```

### Concepts (C++20)

```cpp
#include <concepts>
#include <string>

template<typename T>
concept Serializable = requires(const T& obj) {
    { obj.to_json() } -> std::convertible_to<std::string>;
    { T::from_json(std::string{}) } -> std::same_as<T>;
};

template<typename T>
concept Numeric = std::integral<T> || std::floating_point<T>;

// Constrained function — clear error messages if requirements aren't met
template<Serializable T>
void save(const T& entity) {
    auto json = entity.to_json();
    storage.write(json);
}

// Constrained with shorthand
auto sum(Numeric auto a, Numeric auto b) {
    return a + b;
}
```

### Ranges (C++20)

```cpp
#include <ranges>
#include <vector>
#include <algorithm>

namespace rv = std::ranges::views;

std::vector<std::string> get_active_emails(const std::vector<User>& users) {
    auto result = users
        | rv::filter([](const User& u) { return u.is_active(); })
        | rv::transform([](const User& u) { return u.email(); })
        | rv::take(100);

    return {result.begin(), result.end()};
}

// Composable pipelines
auto even_squares = rv::iota(1, 100)
    | rv::filter([](int n) { return n % 2 == 0; })
    | rv::transform([](int n) { return n * n; });

// Range algorithms with projections
std::ranges::sort(users, {}, &User::name);  // sort by name projection
auto it = std::ranges::find(users, "alice@test.com", &User::email);
```

### std::expected (C++23) — Error Handling Without Exceptions

```cpp
#include <expected>
#include <string>
#include <system_error>

enum class ParseError { InvalidFormat, OutOfRange, Empty };

std::expected<int, ParseError> parse_port(std::string_view input) {
    if (input.empty()) return std::unexpected(ParseError::Empty);

    int port = 0;
    auto [ptr, ec] = std::from_chars(input.data(), input.data() + input.size(), port);
    if (ec != std::errc{}) return std::unexpected(ParseError::InvalidFormat);
    if (port < 1 || port > 65535) return std::unexpected(ParseError::OutOfRange);

    return port;
}

// Caller
auto result = parse_port("8080");
if (result) {
    start_server(*result);
} else {
    switch (result.error()) {
        case ParseError::Empty: log("port is empty"); break;
        case ParseError::InvalidFormat: log("invalid port format"); break;
        case ParseError::OutOfRange: log("port out of range"); break;
    }
}

// Monadic chaining (C++23)
auto config = parse_port(input)
    .and_then([](int port) -> std::expected<Config, ParseError> {
        return Config{.port = port};
    })
    .transform([](Config c) { c.validated = true; return c; });
```

### Structured Bindings and std::optional

```cpp
#include <optional>
#include <map>

std::optional<User> find_user(const std::map<int, User>& users, int id) {
    if (auto it = users.find(id); it != users.end()) {
        return it->second;
    }
    return std::nullopt;
}

// Structured bindings (C++17)
auto [name, age, email] = get_user_tuple();

for (const auto& [key, value] : config_map) {
    std::println("{}={}", key, value);  // C++23 print
}
```

### Coroutines (C++20)

```cpp
#include <coroutine>
#include <generator> // C++23

// Generator coroutine
std::generator<int> fibonacci() {
    int a = 0, b = 1;
    while (true) {
        co_yield a;
        auto next = a + b;
        a = b;
        b = next;
    }
}

// Usage
for (auto n : fibonacci() | rv::take(10)) {
    std::print("{} ", n);
}

// Async task (simplified, real-world uses a library like cppcoro)
Task<std::string> fetch_data(std::string url) {
    auto response = co_await http::get(url);
    co_return response.body();
}
```

## Best Practices

- Use `std::unique_ptr` by default; `std::shared_ptr` only when ownership is genuinely shared
- Use concepts to constrain templates — produces clear error messages
- Use ranges pipelines over raw loops for data transformations
- Use `std::expected` or `std::optional` over error codes and exceptions for expected failures
- Use `std::string_view` for function parameters that don't need ownership
- Mark destructors, move constructors, and move assignments `noexcept`
- Use `[[nodiscard]]` on functions whose return values must not be ignored

## Anti-patterns

- Raw `new`/`delete` — use smart pointers and containers
- `reinterpret_cast` without strict aliasing awareness
- Passing `shared_ptr` by value when a reference or raw pointer suffices
- SFINAE when concepts express the constraint more clearly
- Throwing exceptions in destructors — causes `std::terminate`
- Using `const_cast` to modify genuinely const data — undefined behavior

## Testing Strategy

- Use Google Test or Catch2 for unit tests with structured test fixtures
- Use `EXPECT_THAT` (Google Mock) or Catch2 matchers for expressive assertions
- Test RAII by verifying cleanup in destructors with mock resources
- Use AddressSanitizer (`-fsanitize=address`) and UBSan in CI
- Benchmark with Google Benchmark to catch performance regressions
- Use `static_assert` with concepts to verify type constraints at compile time


## Related

- **Agents**: [cpp-build-resolver](../../agents/cpp-build-resolver.md)
- **Commands**: [/build-fix](../../commands/build-fix.md)
