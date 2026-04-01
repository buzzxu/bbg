# /test-coverage

## Description
Analyze test coverage to identify untested code paths, suggest test strategies, and prioritize what to test next.

## Usage
```
/test-coverage
/test-coverage src/commands/
/test-coverage --threshold 80
```

## Process
1. **Run coverage** — Execute `npm test -- --coverage` to generate coverage report
2. **Parse results** — Extract per-file coverage: statements, branches, functions, lines
3. **Identify gaps** — Find files and functions with low or zero coverage
4. **Categorize risk** — Prioritize uncovered code by criticality:
   - Critical: Security, data handling, user-facing commands
   - High: Business logic, validators, transformers
   - Medium: Utilities, helpers, formatters
   - Low: Types, constants, configuration
5. **Suggest tests** — For each gap, propose specific test cases
6. **Generate stubs** — Create test file stubs for untested modules
7. **Report** — Summary with coverage table and prioritized action items

## Output
- Coverage summary table (file, statements%, branches%, functions%, lines%)
- List of uncovered critical paths with suggested test cases
- Generated test stubs for untested files
- Recommendations for improving coverage strategy

## Rules
- Focus on meaningful coverage, not just line count
- Branch coverage matters more than line coverage
- Prioritize testing error paths and edge cases
- Don't suggest tests for trivial code (type exports, constants)
- Consider both unit and integration test strategies

## Examples
```
/test-coverage
/test-coverage src/commands/
/test-coverage --threshold 80    # Flag files below 80%
```

## Related

- **Skills**: [tdd-workflow](../skills/tdd-workflow/SKILL.md)
- **Rules**: [testing](../rules/common/testing.md)
