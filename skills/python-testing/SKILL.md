---
name: python-testing
category: python
description: Python testing with pytest fixtures, parametrize, mocking, coverage, and property-based testing with hypothesis
---

# Python Testing

## Overview

Use this skill when writing or reviewing Python test suites. These patterns cover pytest idioms, fixture design, mocking strategies, property-based testing, and coverage enforcement.

## Key Patterns

### Fixtures with Scope and Dependency Injection

```python
import pytest
from unittest.mock import AsyncMock

@pytest.fixture
def db_session():
    """Per-test database session with automatic rollback."""
    session = create_session()
    session.begin_nested()  # savepoint
    yield session
    session.rollback()
    session.close()

@pytest.fixture(scope="module")
def api_client(db_session):
    """Reuse across tests in the same module."""
    app = create_app(db=db_session)
    return TestClient(app)

def test_create_user(api_client, db_session):
    res = api_client.post("/users", json={"name": "Alice"})
    assert res.status_code == 201
    assert db_session.query(User).count() == 1
```

### Parametrize — Data-Driven Tests

```python
@pytest.mark.parametrize("input_val,expected", [
    ("hello", "HELLO"),
    ("world", "WORLD"),
    ("", ""),
    ("123abc", "123ABC"),
])
def test_uppercase(input_val: str, expected: str):
    assert input_val.upper() == expected

# Parametrize with IDs for readable output
@pytest.mark.parametrize("status,allowed", [
    pytest.param(200, True, id="ok"),
    pytest.param(403, False, id="forbidden"),
    pytest.param(500, False, id="server-error"),
])
def test_is_allowed(status: int, allowed: bool):
    assert is_success(status) == allowed
```

### Mocking with pytest-mock and unittest.mock

```python
from unittest.mock import patch, MagicMock

def test_send_email(mocker):
    mock_smtp = mocker.patch("app.email.smtplib.SMTP")
    send_welcome_email("alice@example.com")
    mock_smtp.return_value.__enter__.return_value.sendmail.assert_called_once()

# Mock async dependencies
@pytest.fixture
def mock_repo():
    repo = AsyncMock()
    repo.find_by_id.return_value = User(id="1", name="Alice")
    return repo

async def test_get_user(mock_repo):
    service = UserService(repo=mock_repo)
    user = await service.get("1")
    assert user.name == "Alice"
    mock_repo.find_by_id.assert_awaited_once_with("1")
```

### Property-Based Testing with Hypothesis

```python
from hypothesis import given, strategies as st, assume

@given(st.lists(st.integers()))
def test_sort_is_idempotent(xs: list[int]):
    sorted_once = sorted(xs)
    sorted_twice = sorted(sorted_once)
    assert sorted_once == sorted_twice

@given(st.text(min_size=1))
def test_encode_decode_roundtrip(s: str):
    assert decode(encode(s)) == s

# Custom strategy for domain objects
user_strategy = st.builds(
    User,
    name=st.text(min_size=1, max_size=100),
    age=st.integers(min_value=0, max_value=150),
)

@given(user_strategy)
def test_user_serialization(user: User):
    assert User.from_dict(user.to_dict()) == user
```

### Async Test Support

```python
import pytest

@pytest.mark.anyio
async def test_fetch_data():
    async with AsyncClient(app=app) as client:
        response = await client.get("/data")
    assert response.status_code == 200
    assert "items" in response.json()
```

### Snapshot / Golden File Testing

```python
def test_report_output(snapshot):
    report = generate_report(sample_data)
    assert report == snapshot  # auto-updates with --snapshot-update
```

## Best Practices

- Use fixtures for setup/teardown — never use `setUp`/`tearDown` methods
- Prefer `pytest.raises(ExcType, match=r"pattern")` over bare try/except
- Use `tmp_path` fixture for file system tests — automatically cleaned up
- Keep tests independent — no shared mutable state between test functions
- Name tests `test_<unit>_<scenario>_<expected>` for clarity
- Target 80%+ line coverage; enforce with `--cov-fail-under=80`

## Anti-patterns

- Testing implementation details (private methods, internal state)
- Over-mocking — if you mock everything, you test nothing
- Fixtures with side effects that leak between tests
- Using `time.sleep` in tests — use `freezegun` or event-based waits
- Ignoring flaky tests instead of fixing the root cause

## Testing Strategy

- Structure: `tests/unit/`, `tests/integration/`, `tests/e2e/`
- Run fast unit tests on every commit; integration tests in CI
- Use `pytest-xdist` for parallel execution: `pytest -n auto`
- Generate coverage with `pytest --cov=src --cov-report=html`
- Use Hypothesis profiles: quick for local, thorough for CI
