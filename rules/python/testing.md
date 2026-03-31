# Testing: Python

Python-specific testing rules using pytest.

## Mandatory

- Use `pytest` as the test runner — never `unittest.TestCase` for new tests
- Place test files in `tests/` mirroring `src/` structure: `tests/test_<module>.py`
- Use `conftest.py` for shared fixtures — scope them appropriately (function, module, session)
- Use `@pytest.fixture` for test setup — never use `setUp`/`tearDown` methods
- Type-hint all fixture return types and test function parameters
- Run `pytest --cov --cov-fail-under=80` in CI — enforce minimum coverage
- Use `pytest.raises(ExactException)` to test error cases — always match the specific type

## Recommended

- Use `@pytest.mark.parametrize` to test multiple inputs without duplicating test functions
- Use `factory_boy` or fixture factories for complex test data construction
- Use `hypothesis` for property-based testing on functions with broad input domains
- Use `pytest-asyncio` for testing async code with proper event loop management
- Use `freezegun` or `time-machine` for time-dependent tests — never mock `time.time` manually
- Organize conftest.py by scope: root `conftest.py` for session, package-level for module fixtures
- Use `tmp_path` fixture for filesystem tests — never write to fixed paths
- Use `monkeypatch` for environment variables and attribute patching — it auto-cleans
- Mark slow tests with `@pytest.mark.slow` and exclude from fast CI runs

## Forbidden

- `unittest.TestCase` in new test files — use plain pytest functions
- Fixtures that perform network calls without mocking — use `responses` or `httpx_mock`
- `assert True` or `assert False` — always assert a specific condition or value
- Tests that depend on test execution order — each test must pass in isolation
- `@pytest.mark.skip` without a reason and issue reference
- Using `mock.patch` on the module under test — only patch its dependencies

## Examples

```python
# Good: Parametrized test with typed fixture
@pytest.fixture
def sample_user() -> User:
    return User(name="Alice", email="alice@example.com", role="admin")

@pytest.mark.parametrize("role,expected", [
    ("admin", True),
    ("viewer", False),
    ("editor", False),
])
def test_can_delete_returns_true_only_for_admin(role: str, expected: bool) -> None:
    user = User(name="Test", email="t@t.com", role=role)
    assert can_delete(user) is expected

# Good: Property-based testing
@given(st.text(min_size=1))
def test_slug_contains_only_valid_chars(name: str) -> None:
    slug = slugify(name)
    assert all(c.isalnum() or c == "-" for c in slug)

# Bad: No assertion specificity
def test_user():
    user = get_user(1)
    assert user  # What exactly is being tested?
```


## Related

- **Agents**: [python-reviewer](../../agents/python-reviewer.md)
- **Skills**: [python-testing](../../skills/python-testing/SKILL.md), [tdd-workflow](../../skills/tdd-workflow/SKILL.md)
- **Commands**: [/python-test](../../commands/python-test.md), [/tdd](../../commands/tdd.md)
