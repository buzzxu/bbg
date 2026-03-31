---
name: typescript-patterns
category: typescript
description: TypeScript idioms including strict mode, ESM, discriminated unions, branded types, template literals, const assertions, and satisfies operator
---

# TypeScript Patterns

## Overview

Use this skill when writing or reviewing TypeScript code that needs to leverage the type system effectively. These patterns produce safer, more expressive code and catch entire categories of bugs at compile time rather than runtime.

## Key Patterns

### Discriminated Unions

Model state machines and exclusive variants with a shared literal discriminant:

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function handle(result: Result<string>) {
  if (result.ok) {
    console.log(result.value); // narrowed to { ok: true; value: string }
  } else {
    console.error(result.error); // narrowed to { ok: false; error: Error }
  }
}
```

### Branded Types

Prevent accidental mixing of structurally identical types:

```typescript
type UserId = string & { readonly __brand: unique symbol };
type OrderId = string & { readonly __brand: unique symbol };

function createUserId(id: string): UserId { return id as UserId; }
function getUser(id: UserId): User { /* ... */ }

// getUser(orderId) — compile error, even though both are strings
```

### Const Assertions & Satisfies

Lock down literal types while retaining inference:

```typescript
const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  settings: "/settings",
} as const satisfies Record<string, `/${string}`>;

// typeof ROUTES.home is "/" not string
```

### Template Literal Types

Derive string types from unions:

```typescript
type Event = "click" | "focus" | "blur";
type Handler = `on${Capitalize<Event>}`; // "onClick" | "onFocus" | "onBlur"

function on<E extends Event>(event: E, cb: () => void): void { /* ... */ }
```

### ESM Strict Module Pattern

```typescript
// Use .js extensions in imports for ESM compatibility
import { parse } from "./parser.js";

// Explicit exports — no default exports for better refactoring
export { parse, format, validate };

// Package.json: "type": "module", "exports" field for dual CJS/ESM
```

### Exhaustive Pattern Matching

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

type Shape = { kind: "circle"; r: number } | { kind: "rect"; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "rect":   return s.w * s.h;
    default:       return assertNever(s); // compile error if a variant is missed
  }
}
```

## Best Practices

- Enable `strict: true` in tsconfig — never weaken with `any` casts
- Prefer `unknown` over `any` at system boundaries; narrow with type guards
- Use `readonly` arrays and properties by default; opt into mutability explicitly
- Prefer `interface` for public API shapes; use `type` for unions and intersections
- Co-locate type definitions with the module that owns them
- Use `satisfies` to validate literals without widening inferred types

## Anti-patterns

- Using `any` to silence errors instead of fixing the underlying type issue
- Exporting barrel `index.ts` files that re-export everything — causes tree-shaking failures
- Overusing enums — prefer `as const` objects or union types for serializable values
- Type assertions (`as T`) when a type guard or `satisfies` would be safer
- Deeply nested conditional types — extract into named helper types

## Testing Strategy

- Use `vitest` or `jest` with `ts-jest` for unit tests
- Use `tsd` or `expect-type` to assert compile-time types in tests
- Test discriminated unions by covering every variant in switch/match
- Use `@ts-expect-error` in test files to verify that invalid code is rejected
- Run `tsc --noEmit` in CI to catch type regressions without building
