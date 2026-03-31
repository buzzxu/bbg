# Security: Python

Python-specific security rules for web applications and services.

## Mandatory

- Use parameterized queries for all database access — never format SQL with f-strings or `%`
- Use Django CSRF middleware or equivalent — never disable CSRF protection on state-changing views
- Escape all user content in templates — use `{{ variable }}` (auto-escaped), never `|safe` on user data
- Validate all user input with Pydantic, Django Forms, or marshmallow at the API boundary
- Use `secrets` module for generating tokens, passwords, and nonces — never `random`
- Never use `pickle.loads()` on untrusted data — it allows arbitrary code execution
- Set `HttpOnly`, `Secure`, and `SameSite` flags on all session and auth cookies

## Recommended

- Use `bandit` in CI to scan for common security issues in Python code
- Use `safety` or `pip-audit` to check for known vulnerabilities in dependencies
- Implement rate limiting with `django-ratelimit` or `slowapi` on authentication endpoints
- Use `hashlib.scrypt` or `argon2-cffi` for password hashing — never MD5 or SHA family alone
- Validate file uploads: check MIME type, file size limits, and store outside the web root
- Use `defusedxml` instead of stdlib `xml` parsers — prevents XXE attacks
- Sanitize log output — strip PII, tokens, and passwords before writing to logs
- Use `pyotp` for TOTP-based two-factor authentication implementation

## Forbidden

- `eval()`, `exec()`, or `compile()` with any user-controlled input
- `pickle.loads()` or `yaml.load()` (use `yaml.safe_load()`) on untrusted data
- `os.system()` or `subprocess.call(shell=True)` — use `subprocess.run(args_list)` with no shell
- `DEBUG = True` in production — ensure it is always `False` in deployed environments
- Storing passwords in plaintext — always hash with a strong, salted algorithm
- Template `|safe` filter on user-provided content — sanitize first with `bleach` or equivalent
- Disabling Django's `SecurityMiddleware` or `CsrfViewMiddleware`

## Examples

```python
# Good: Parameterized query
cursor.execute("SELECT * FROM users WHERE email = %s", [email])

# Bad: SQL injection vulnerability
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")

# Good: Secrets module for tokens
import secrets
token = secrets.token_urlsafe(32)

# Bad: Predictable random
import random
token = str(random.randint(0, 999999))

# Good: Safe YAML loading
import yaml
data = yaml.safe_load(user_input)

# Bad: Arbitrary code execution
data = yaml.load(user_input, Loader=yaml.FullLoader)
```
