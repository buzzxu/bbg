# /python-test

## Description
Python-specific TDD workflow using pytest with fixtures, parametrize, and monkeypatch patterns. Enforces RED-GREEN-IMPROVE cycle with Python idioms.

## Usage
```
/python-test "function or behavior to test"
/python-test "parse_config should handle missing fields"
```

## Process
1. **Understand behavior** — Clarify the function or behavior under test
2. **RED phase** — Write a failing test:
   - Create test file at `tests/test_<module>.py`
   - Use descriptive function names: `test_<behavior>_<scenario>`
   - Use `@pytest.mark.parametrize` for multiple input cases
   - Run `pytest <test-file> -v` to confirm failure
3. **GREEN phase** — Implement minimum code to pass:
   - No extra logic beyond what tests require
   - Run `pytest <test-file> -v` to confirm pass
4. **IMPROVE phase** — Refactor test and implementation:
   - Extract `@pytest.fixture` for shared setup
   - Use `monkeypatch` for dependency patching
   - Use `tmp_path` for file system tests
   - Add edge cases with `pytest.raises()` for error scenarios
   - Run `pytest --cov` to check coverage
5. **Repeat** — Add more test cases for additional behaviors

## Output
After each cycle:
- Test file with all test cases
- Implementation code
- `pytest` output at each phase
- Coverage summary

## Rules
- Always use `@pytest.fixture` for reusable setup, not manual setUp methods
- Use `monkeypatch` over `unittest.mock.patch` for simpler patching
- Use `tmp_path` fixture for tests that need temporary files
- Test error cases with `pytest.raises(ExceptionType)` context manager
- Use `@pytest.mark.parametrize` for data-driven tests over copy-paste cases
- Keep fixtures scoped appropriately — default to function scope
- Use `conftest.py` for shared fixtures across test modules

## Examples
```
/python-test "Handler should return 404 for unknown routes"
/python-test "parse_config handles empty YAML gracefully"
/python-test "Cache expires entries after TTL"
```
