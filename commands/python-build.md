# /python-build

## Description
Fix Python build and packaging errors by running type checkers and build tools, categorizing errors, and fixing them systematically with re-verification after each fix.

## Usage
```
/python-build
/python-build src/handlers/
/python-build --typecheck
```

## Process
1. **Run type check** — Execute `mypy .` or `pyright` and capture all errors
2. **Run build** — Execute `python -m build` or `poetry build` and capture errors
3. **Categorize errors** — Group by type:
   - Import errors (missing modules, circular imports, relative vs absolute)
   - Dependency errors (version conflicts, missing packages, incompatible extras)
   - Packaging errors (missing `__init__.py`, bad `pyproject.toml`, entry point config)
   - Type errors (mypy/pyright violations, missing type stubs, generic constraints)
4. **Prioritize** — Fix in order: dependencies → imports → packaging → types
5. **Fix one at a time** — Apply smallest change to resolve each error
6. **Re-verify** — Run `mypy .` or `pyright` after each fix
7. **Final check** — Run `pip install -e . && python -m pytest`

## Output
For each error fixed:
- Error message and file:line location
- Root cause analysis
- Fix applied
- Remaining error count

Final summary:
- Total errors found and fixed
- Type check status: pass/fail
- Build status: pass/fail
- Test status: pass/fail

## Rules
- Fix dependency issues first — many import errors resolve when packages are installed
- Run `pip install -e .` to validate the package installs correctly in dev mode
- Never ignore type errors with `# type: ignore` without a specific error code
- Use `pip check` to diagnose dependency conflicts
- Check `pyproject.toml` or `setup.cfg` if packaging errors appear
- Verify virtual environment is active before diagnosing import failures
- Run `python -c "import <package>"` to quickly test import resolution

## Examples
```
/python-build                # Build entire project
/python-build src/handlers/  # Focus on specific directory
/python-build --typecheck    # Type check only with mypy
```

## Related

- **Agents**: [python-build-resolver](../agents/python-build-resolver.md)
- **Skills**: [python-patterns](../skills/python-patterns/SKILL.md), [ci-cd-patterns](../skills/ci-cd-patterns/SKILL.md)
- **Rules**: [coding-style](../rules/python/coding-style.md)
