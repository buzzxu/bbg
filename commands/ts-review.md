# /ts-review

## Description
TypeScript-specific code review focusing on type safety, strict mode compliance, ESM patterns, and TypeScript idioms.

## Usage
```
/ts-review [file or directory]
/ts-review src/analyzers/detect-stack.ts
/ts-review src/
```

## Process
1. **Type safety** — Check for `any` usage, missing return types, unsafe casts
2. **Strict mode** — Verify strict null checks, no implicit any, strict property initialization
3. **ESM compliance** — Ensure `.js` extensions on imports, proper `type: "module"` usage
4. **Generics** — Review generic usage for correctness and readability
5. **Type narrowing** — Check discriminated unions, type guards, exhaustive checks
6. **Async patterns** — Verify proper async/await usage, no floating promises
7. **Interface design** — Review interface vs type alias decisions, readonly usage
8. **Error types** — Ensure typed error handling, not just `catch(e: any)`

## Output
TypeScript-specific findings:
- Type safety issues with suggested fixes
- Places where types can be narrowed or strengthened
- ESM import issues
- Async pattern problems
- Overall TypeScript health score

## Rules
- Always check tsconfig.json strict settings first
- Flag every use of `any` — suggest proper types
- Verify `as` casts are necessary and safe
- Check for missing `readonly` on properties that shouldn't mutate
- Ensure enums are used correctly (prefer const enums or unions)
- Validate that `import type` is used for type-only imports

## Examples
```
/ts-review src/analyzers/detect-stack.ts
/ts-review src/commands/
/ts-review src/
```

## Related

- **Agents**: [typescript-reviewer](../agents/typescript-reviewer.md)
- **Skills**: [typescript-patterns](../skills/typescript-patterns/SKILL.md), [react-patterns](../skills/react-patterns/SKILL.md), [nextjs-patterns](../skills/nextjs-patterns/SKILL.md), [vue-patterns](../skills/vue-patterns/SKILL.md)
- **Rules**: [coding-style](../rules/typescript/coding-style.md), [testing](../rules/typescript/testing.md)
