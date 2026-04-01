# Coding Style: Python

Python-specific coding style rules layered on top of common rules.

## Mandatory

- Follow PEP 8 strictly — enforce with `ruff` or `black` for formatting
- Add type hints to all function signatures and return types — enforce with `mypy --strict`
- Use `dataclasses` or `pydantic` models over raw dictionaries for structured data
- Use f-strings for string formatting — never `%` formatting or `.format()` for new code
- Define `__all__` in every module to control public API surface
- Use `pathlib.Path` over `os.path` for all filesystem operations
- Prefer list/dict/set comprehensions over `map()` and `filter()` for readability
- Use `from __future__ import annotations` for modern annotation syntax in Python 3.9+

## Recommended

- Use the walrus operator (`:=`) to avoid redundant computations in conditionals
- Use `match` statements (Python 3.10+) for complex branching over chained `if/elif`
- Prefer `enum.Enum` or `enum.StrEnum` for fixed sets of values
- Use `functools.cache` or `functools.lru_cache` for expensive pure functions
- Use `collections.abc` types (`Sequence`, `Mapping`) in function signatures over concrete types
- Prefer `tuple` over `list` for immutable sequences
- Use `contextlib.contextmanager` for resource management patterns
- Use `typing.Protocol` for structural subtyping instead of ABCs when possible
- Structure packages with `__init__.py` re-exports for clean public APIs

## Forbidden

- `from module import *` — always import names explicitly
- Mutable default arguments: `def f(items=[])` — use `None` and create inside function
- Bare `except:` or `except Exception:` without re-raising or logging
- Global mutable state — no module-level mutable variables
- `type: ignore` without a specific error code and justification comment
- Using `dict` when a `dataclass`, `TypedDict`, or `NamedTuple` is more appropriate
- `os.system()` or `subprocess.call(shell=True)` — use `subprocess.run()` with a list

## Examples

```python
# Good: Typed dataclass
@dataclass(frozen=True)
class UserConfig:
    host: str
    port: int = 8080
    debug: bool = False

# Bad: Raw dict
config = {"host": "localhost", "port": 8080, "debug": False}

# Good: Walrus operator
if (match := pattern.search(text)) is not None:
    process(match.group(1))

# Bad: Redundant call
match = pattern.search(text)
if match is not None:
    process(match.group(1))

# Good: f-string
message = f"User {user.name} logged in at {timestamp}"

# Bad: format
message = "User {} logged in at {}".format(user.name, timestamp)
```


## Related

- **Agents**: [python-reviewer](../../agents/python-reviewer.md), [python-build-resolver](../../agents/python-build-resolver.md)
- **Skills**: [python-patterns](../../skills/python-patterns/SKILL.md)
- **Commands**: [/python-review](../../commands/python-review.md), [/python-build](../../commands/python-build.md)
