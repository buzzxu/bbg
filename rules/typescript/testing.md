# Testing: TypeScript

TypeScript-specific testing rules using Vitest/Jest.

## Mandatory

- Use Vitest for all new projects; Jest is acceptable for existing codebases only
- Type-check test files — never exclude `tests/` from `tsconfig.json`
- Mock only at module boundaries (HTTP clients, database, filesystem) — not internal functions
- Use `vi.fn()` / `jest.fn()` with explicit type parameters: `vi.fn<[string], Promise<User>>()`
- Assert types in tests using `expectTypeOf` (Vitest) for public API type contracts
- Clean up all mocks in `afterEach` — use `vi.restoreAllMocks()` or `jest.restoreAllMocks()`
- Test error paths: verify that functions throw/reject with the correct error type and message

## Recommended

- Use factory functions for test data: `function createUser(overrides?: Partial<User>): User`
- Use `vi.hoisted()` for mock declarations that need to be hoisted above imports
- Prefer `toEqual` for deep object comparison, `toBe` for primitives and references
- Use `test.each` / `it.each` for parameterized tests to reduce duplication
- Prefer inline snapshots (`toMatchInlineSnapshot`) over file snapshots for small outputs
- Use `vi.useFakeTimers()` for time-dependent tests — never `setTimeout` in tests
- Group related tests with `describe` blocks matching the function or class under test
- Use `satisfies` in test assertions to catch type regressions

## Forbidden

- `as any` in test files to bypass type checking — fix the types instead
- Snapshot tests for business logic — snapshots are only for serialized UI output
- Importing internal/private modules for testing — test through the public API
- `test.only` or `describe.only` committed to the repository
- Mocking the module under test — only mock its dependencies
- Tests that rely on specific file system paths or OS-specific behavior

## Examples

```typescript
// Good: Typed factory
function createOrder(overrides?: Partial<Order>): Order {
  return { id: "ord-1", status: "pending", total: 100, ...overrides };
}

// Good: Type testing
expectTypeOf(parseConfig).toBeCallableWith("path/to/config.json");
expectTypeOf(parseConfig).returns.toMatchTypeOf<Config>();

// Bad: Untyped mock
const mockFn = vi.fn();  // No type parameters

// Good: Parameterized test
it.each([
  ["active", true],
  ["inactive", false],
])("isActive returns %s for status %s", (status, expected) => {
  expect(isActive(status)).toBe(expected);
});
```


## Related

- **Agents**: [typescript-reviewer](../../agents/typescript-reviewer.md)
- **Skills**: [typescript-patterns](../../skills/typescript-patterns/SKILL.md), [tdd-workflow](../../skills/tdd-workflow/SKILL.md)
- **Commands**: [/ts-test](../../commands/ts-test.md), [/tdd](../../commands/tdd.md)
