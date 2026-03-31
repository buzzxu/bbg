# Coding Style: TypeScript

TypeScript-specific coding style rules layered on top of common rules.

## Mandatory

- Enable `strict: true` in `tsconfig.json` — no exceptions
- Use ESM-only modules with `.js` extensions in import paths (for Node.js ESM compat)
- Never use `any` — use `unknown` and narrow with type guards instead
- Prefer discriminated unions over enums for state modeling
- Use `readonly` on all properties and parameters that should not be mutated
- Use `const` assertions (`as const`) for literal types and tuple inference
- Prefer `interface` for object shapes that may be extended; `type` for unions and intersections
- Export types explicitly: `export type { UserConfig }` separate from value exports

## Recommended

- Use the `satisfies` operator to validate types without widening: `const x = {} satisfies Config`
- Use branded types for domain primitives: `type UserId = string & { __brand: "UserId" }`
- Prefer `Record<string, T>` over `{ [key: string]: T }` for index signatures
- Use `Map` and `Set` over plain objects when keys are dynamic or non-string
- Leverage template literal types for string validation patterns
- Use `Readonly<T>`, `Partial<T>`, `Required<T>` utility types over manual redefinition
- Prefer `unknown` in catch blocks: `catch (err: unknown)`
- Use barrel exports (`index.ts`) sparingly — they harm tree-shaking

## Forbidden

- `any` type — always use `unknown` with type narrowing or a specific type
- `// @ts-ignore` or `// @ts-expect-error` without a linked issue explaining why
- `enum` for new code — use discriminated unions or `as const` objects instead
- Non-null assertion operator (`!`) — use proper null checks or optional chaining
- `require()` calls — use ESM `import` exclusively
- Default exports — use named exports for better refactoring and tree-shaking

## Examples

```typescript
// Good: Discriminated union
type Result = { ok: true; data: User } | { ok: false; error: string };

// Bad: Enum
enum Status { Active, Inactive }

// Good: Branded type
type UserId = string & { readonly __brand: unique symbol };

// Bad: Untyped
function getUser(id: any): any { ... }

// Good: satisfies
const config = { port: 3000, host: "localhost" } satisfies ServerConfig;
```
