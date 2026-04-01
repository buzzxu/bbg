# /refactor-clean

## Description
Remove dead code, fix DRY violations, clean unused imports, and improve code organization without changing behavior.

## Usage
```
/refactor-clean
/refactor-clean src/analyzers/
/refactor-clean --aggressive
```

## Process
1. **Run tests** — Establish baseline (all tests must pass before refactoring)
2. **Find dead code** — Identify unused exports, unreachable code, unused variables
3. **Find DRY violations** — Locate duplicated logic that should be extracted
4. **Find unused imports** — Detect imports that are no longer referenced
5. **Find unused dependencies** — Check package.json for unused packages
6. **Plan changes** — Group related cleanups, order by risk (low → high)
7. **Apply changes** — One logical change at a time
8. **Re-verify** — Run tests after each change to ensure no regression
9. **Summary** — Report what was removed/consolidated and lines saved

## Output
- List of dead code removed (with file:line references)
- DRY violations fixed (extracted utilities, consolidated logic)
- Unused imports and dependencies removed
- Line count delta (before vs after)
- Test results confirming no regressions

## Rules
- ALWAYS run tests before and after refactoring
- Never change behavior — only structure
- Extract shared logic to src/utils/ per project convention
- One logical change per commit-worthy unit
- If uncertain whether code is dead, check all call sites first
- Flag code that looks dead but might be used dynamically

## Examples
```
/refactor-clean
/refactor-clean src/analyzers/    # Focus on one directory
/refactor-clean --aggressive      # Include risky removals
```

## Related

- **Agents**: [refactor-cleaner](../agents/refactor-cleaner.md)
- **Skills**: [coding-standards](../skills/coding-standards/SKILL.md), [search-first](../skills/search-first/SKILL.md)
- **Rules**: [coding-style](../rules/common/coding-style.md), [patterns](../rules/common/patterns.md)
