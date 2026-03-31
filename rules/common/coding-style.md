# Coding Style: Common

Universal coding style rules that apply to all languages and projects.

## Mandatory

- Keep functions under 50 lines — extract helpers when exceeding this limit
- Prefer immutability: use `const`, `final`, `val`, or language equivalent by default
- Use early returns to reduce nesting — never exceed 3 levels of indentation
- Handle all errors explicitly — never silently swallow exceptions or error values
- One concept per file — split files that handle multiple unrelated concerns
- Name files with lowercase and hyphens (`detect-stack.ts`, `user_service.py`)
- Name functions as verb phrases (`getUserById`, `parse_config`, `ValidateInput`)
- Name booleans with `is`, `has`, `should` prefixes (`isReady`, `has_permission`)
- Keep lines under 100 characters — break long expressions across multiple lines
- Group imports: stdlib first, external packages second, internal modules third

## Recommended

- Prefer descriptive names over comments — code should be self-documenting
- Use guard clauses at function entry for precondition checks
- Extract magic numbers and strings into named constants
- Prefer composition over inheritance in all object-oriented code
- Keep parameter lists to 3 or fewer — use options objects for more
- Write pure functions where possible — minimize side effects
- Colocate related code: tests near source, types near usage

## Forbidden

- Mutable global state — never use writable module-level variables
- Abbreviations in public APIs (`usr`, `cnt`, `mgr`) — always spell out
- Nested ternaries — use `if/else` or `match/switch` instead
- Dead code in the repository — delete it, git remembers
- `TODO` without an owner or issue reference

## Examples

```
Good: const maxRetries = 3;
Bad:  let x = 3;

Good: function calculateTotalPrice(items: Item[]): number { ... }
Bad:  function calc(i: any): any { ... }

Good: if (!isValid) return { error: "Invalid input" };
Bad:  if (isValid) { if (hasPermission) { if (isReady) { ... } } }
```
