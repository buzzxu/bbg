# /ts-test

## Description
TypeScript-specific TDD workflow using vitest with `describe`/`it`/`expect` patterns, mock utilities, and ESM-compatible imports. Enforces RED-GREEN-IMPROVE cycle with TypeScript idioms.

## Usage
```
/ts-test "function or behavior to test"
/ts-test "parseConfig should handle missing fields"
```

## Process
1. **Understand behavior** — Clarify the function or behavior under test
2. **RED phase** — Write a failing test:
   - Create test file at `tests/unit/<path>/<module>.test.ts`
   - Use `describe`/`it`/`expect` structure with clear descriptions
   - Import with `.js` extensions for ESM compatibility
   - Run `npx vitest run <test-file>` to confirm failure
3. **GREEN phase** — Implement minimum code to pass:
   - No extra logic beyond what tests require
   - Run `npx vitest run <test-file>` to confirm pass
4. **IMPROVE phase** — Refactor test and implementation:
   - Use `vi.mock()` for module-level mocks
   - Use `vi.spyOn()` for partial mocking
   - Add edge cases and error scenarios
   - Run `npx vitest run --coverage` to check coverage
5. **Repeat** — Add more test cases for additional behaviors

## Output
After each cycle:
- Test file with all test cases
- Implementation code
- `vitest` output at each phase
- Coverage summary

## Rules
- Always use `.js` extensions in imports even in test files
- Use `vi.mock()` for dependency injection, not manual stubs
- Use `vi.spyOn()` to observe calls without replacing implementation
- Test error cases and edge cases, not just happy paths
- Use `beforeEach`/`afterEach` for setup and teardown
- Prefer `toEqual` for deep equality, `toBe` for primitives and references
- Clean up mocks with `vi.restoreAllMocks()` in `afterEach`

## Examples
```
/ts-test "Handler should return 404 for unknown routes"
/ts-test "parseConfig handles empty YAML gracefully"
/ts-test "Cache expires entries after TTL"
```

## Related

- **Agents**: [typescript-reviewer](../agents/typescript-reviewer.md)
- **Skills**: [typescript-patterns](../skills/typescript-patterns/SKILL.md), [tdd-workflow](../skills/tdd-workflow/SKILL.md)
- **Rules**: [testing](../rules/typescript/testing.md)
