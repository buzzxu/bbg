# Hook Architecture: Common

Rules for designing, implementing, and testing lifecycle hooks.

## Mandatory

- Hooks must be idempotent — running the same hook twice produces the same result
- Hooks must declare their trigger point explicitly (pre-commit, post-build, on-init, etc.)
- Every hook must have a timeout — never allow a hook to run indefinitely
- Hooks must not modify global state — receive input, return output, no side effects on shared data
- Hook failures must be handled gracefully — a failing hook must not crash the host process
- Hooks must be individually testable in isolation, without the full system running
- Document the hook contract: expected input shape, output shape, and error behavior

## Recommended

- Keep hooks small and focused — one responsibility per hook
- Use a priority/ordering system when multiple hooks run at the same trigger point
- Provide a dry-run mode for hooks that perform destructive operations
- Log hook execution start/end with duration for observability
- Allow hooks to be enabled/disabled via configuration without code changes
- **Hook vs Rule**: Rules are static declarations; hooks are executable code triggered by events
- **Hook vs Skill**: Skills provide domain instructions; hooks execute logic at lifecycle points
- Use hooks for: validation, transformation, notification, metrics collection
- Avoid hooks for: core business logic (use services), UI rendering, data persistence

## Forbidden

- Hooks that depend on execution order of other hooks — each must be independent
- Hooks that perform network calls without timeouts and retry logic
- Hooks that silently swallow errors — always propagate or log failures
- Circular hook triggers — hook A must never trigger hook B which triggers hook A
- Hooks that mutate their input arguments — always return new data

## Examples

```
Good:
  function preCommitHook(files: string[]): HookResult {
    const issues = validateFiles(files);
    return { passed: issues.length === 0, issues };
  }

Bad:
  function preCommitHook(context: GlobalContext): void {
    context.files = context.files.filter(f => isValid(f));  // mutates input
    // no return value, no error handling
  }
```
