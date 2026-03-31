---
name: python-patterns
category: python
description: Python idioms including type hints, dataclasses, protocols, async/await, context managers, generators, and pattern matching
---

# Python Patterns

## Overview

Use this skill when writing or reviewing modern Python (3.10+) code. These patterns emphasize type safety, clean APIs, and idiomatic constructs that make Python code more maintainable and performant.

## Key Patterns

### Type Hints and Protocols (Structural Typing)

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Serializable(Protocol):
    def to_dict(self) -> dict[str, object]: ...

def save(entity: Serializable) -> None:
    data = entity.to_dict()  # any object with to_dict() works — no inheritance needed
    db.insert(data)

# Works with any class that implements to_dict()
class User:
    def __init__(self, name: str) -> None:
        self.name = name
    def to_dict(self) -> dict[str, object]:
        return {"name": self.name}
```

### Dataclasses with Slots and Frozen

```python
from dataclasses import dataclass, field

@dataclass(frozen=True, slots=True)
class Config:
    host: str
    port: int = 8080
    tags: list[str] = field(default_factory=list)

# Immutable, memory-efficient, auto __eq__, __hash__, __repr__
config = Config(host="localhost")
```

### Structural Pattern Matching (3.10+)

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

def describe(shape: object) -> str:
    match shape:
        case Point(x=0, y=0):
            return "origin"
        case Point(x, y) if x == y:
            return f"diagonal at {x}"
        case Point(x, y):
            return f"point({x}, {y})"
        case _:
            return "unknown"
```

### Context Managers

```python
from contextlib import contextmanager, asynccontextmanager

@contextmanager
def managed_connection(url: str):
    conn = Connection(url)
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# Usage
with managed_connection("postgres://...") as conn:
    conn.execute("SELECT 1")
```

### Async/Await with Structured Concurrency

```python
import asyncio
from collections.abc import AsyncIterator

async def fetch_all(urls: list[str]) -> list[dict]:
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch(url)) for url in urls]
    return [t.result() for t in tasks]  # all succeed or TaskGroup raises

async def stream_lines(path: str) -> AsyncIterator[str]:
    async with aiofiles.open(path) as f:
        async for line in f:
            yield line.strip()
```

### Generators for Lazy Pipelines

```python
from collections.abc import Iterator

def read_records(path: str) -> Iterator[dict]:
    with open(path) as f:
        for line in f:
            yield json.loads(line)

def filter_active(records: Iterator[dict]) -> Iterator[dict]:
    return (r for r in records if r["status"] == "active")

# Composes lazily — constant memory regardless of file size
active = filter_active(read_records("data.jsonl"))
```

## Best Practices

- Run `mypy --strict` or `pyright` in CI — treat type errors as build failures
- Use `dataclass(frozen=True, slots=True)` for value objects
- Prefer `Protocol` over ABC for duck-typed interfaces
- Use `asyncio.TaskGroup` (3.11+) over `gather` for structured concurrency
- Prefer generators for large data pipelines to keep memory constant
- Use `pathlib.Path` instead of `os.path` string manipulation

## Anti-patterns

- Using `dict` where a dataclass or TypedDict provides structure
- Bare `except:` or `except Exception:` that swallows errors silently
- Mutable default arguments (`def f(items=[])`) — use `None` with a factory
- Using `type: ignore` to suppress type errors instead of fixing them
- Deeply nested try/except — use context managers to manage resources

## Testing Strategy

- Use `pytest` with type-checked fixtures — avoid `unittest.TestCase`
- Use `pytest.raises` for exception assertions with match patterns
- Test async code with `pytest-asyncio` and `anyio` backend
- Use `freezegun` or `time-machine` for time-dependent tests
- Run `mypy` / `pyright` as a test step to catch type regressions


## Related

- **Agents**: [python-reviewer](../../agents/python-reviewer.md), [python-build-resolver](../../agents/python-build-resolver.md)
- **Rules**: [python/coding-style](../../rules/python/coding-style.md), [python/testing](../../rules/python/testing.md)
- **Commands**: [/python-review](../../commands/python-review.md), [/python-build](../../commands/python-build.md), [/python-test](../../commands/python-test.md)
