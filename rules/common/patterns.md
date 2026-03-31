# Design Patterns: Common

When and how to apply design patterns across all languages.

## Mandatory

- Apply patterns only when they solve a concrete problem — never for speculation
- Name classes and modules after the pattern they implement (`UserRepository`, `PriceStrategy`)
- Use the Repository pattern for all data access — isolate persistence from business logic
- Use the Service Layer pattern to encapsulate business logic above repositories
- Separate I/O (side effects) from pure computation in all architectures

## Recommended

- **Repository**: Wrap data access behind an interface; swap implementations for testing
- **Factory**: Use when object creation requires complex logic or configuration
- **Strategy**: Use when behavior varies by context (pricing rules, auth providers, parsers)
- **Observer/Event Emitter**: Use for decoupling producers from consumers (logging, analytics)
- **Middleware/Chain of Responsibility**: Use for request processing pipelines (auth, logging, validation)
- **Builder**: Use when constructing objects with many optional parameters
- **Adapter**: Use to wrap third-party libraries behind your own interface
- Prefer composition over inheritance — inject collaborators, don't extend base classes

## Forbidden

- **Singleton**: Avoid global mutable singletons — use dependency injection instead
- **God Object**: No class should handle persistence, logic, and presentation together
- **Service Locator**: Never hide dependencies behind a global lookup — inject explicitly
- **Inheritance for code reuse**: Don't extend a class just to reuse methods; compose instead
- **Premature Abstraction**: Don't create interfaces with only one implementation
- **Anemic Domain Model**: Domain objects must contain behavior, not just data fields
- **Circular Dependencies**: Modules must not import each other — extract a shared dependency

## Examples

```
Good: class UserRepository { async findById(id: string): Promise<User> { ... } }
Bad:  class UserManager { db; cache; logger; emailer; /* does everything */ }

Good: function createParser(format: string): Parser { return parsers[format]; }
Bad:  if (format === "json") { ... } else if (format === "xml") { ... } else { ... }

Good: class StripeAdapter implements PaymentGateway { charge(amount) { ... } }
Bad:  stripe.charges.create() called directly in 15 different files
```


## Related

- **Agents**: [planner](../../agents/planner.md), [architect](../../agents/architect.md), [refactor-cleaner](../../agents/refactor-cleaner.md)
- **Skills**: [api-design](../../skills/api-design/SKILL.md), [backend-patterns](../../skills/backend-patterns/SKILL.md)
- **Commands**: [/plan](../../commands/plan.md)
