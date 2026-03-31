# /python-review

## Description
Python-specific code review focusing on type hints, PEP 8 compliance, Pythonic idioms, and common pitfalls.

## Usage
```
/python-review [file or directory]
/python-review src/main.py
/python-review src/
```

## Process
1. **Type hints** — Check for missing type annotations on functions and variables
2. **PEP 8** — Verify naming conventions, line length, import ordering
3. **Pythonic idioms** — Ensure use of list comprehensions, context managers, f-strings
4. **Error handling** — Check for bare `except:`, overly broad exception catching
5. **Imports** — Verify import organization (stdlib → third-party → local)
6. **Mutability** — Flag mutable default arguments, unintended shared state
7. **Security** — Check for pickle usage, eval(), SQL string formatting
8. **Performance** — Identify unnecessary loops, missing generators, N+1 patterns

## Output
Python-specific findings:
- Type hint coverage and suggestions
- PEP 8 violations with line references
- Idiomatic improvements
- Security and performance issues
- Overall Python code health score

## Rules
- Check for `pyproject.toml` or `setup.cfg` for project-specific style rules
- Flag mutable default arguments (`def foo(x=[])`) as critical
- Verify `__init__.py` files exist where needed
- Check for proper virtual environment usage
- Ensure `requirements.txt` or `pyproject.toml` pins dependency versions

## Examples
```
/python-review src/main.py
/python-review app/
/python-review --strict    # Include style nitpicks
```
