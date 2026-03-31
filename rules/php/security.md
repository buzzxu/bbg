# Security: PHP

PHP-specific security rules for web applications.

## Mandatory

- Use PDO with prepared statements for all database queries — never concatenate user input into SQL
- Escape all output with `htmlspecialchars($value, ENT_QUOTES, 'UTF-8')` or a template engine's auto-escaping
- Use CSRF tokens on all state-changing forms — verify token on every POST/PUT/DELETE request
- Validate file uploads: check MIME type, file extension, file size; store outside the web root
- Use `password_hash()` with `PASSWORD_ARGON2ID` (or `PASSWORD_BCRYPT`) for all password storage
- Configure sessions with `session.cookie_httponly=1`, `session.cookie_secure=1`, `session.cookie_samesite=Strict`
- Set `expose_php = Off` and `display_errors = Off` in production `php.ini`

## Recommended

- Use a framework's built-in security features (Laravel's CSRF, Symfony's Security component)
- Implement rate limiting on login endpoints — use middleware or a package like `spatie/laravel-rate-limiter`
- Use `random_bytes()` or `random_int()` for security-sensitive random values — never `rand()` or `mt_rand()`
- Validate input with strict type coercion: `filter_var($email, FILTER_VALIDATE_EMAIL)`
- Use Content-Security-Policy headers to prevent XSS and data injection
- Implement HTTP Strict-Transport-Security (HSTS) headers with a long max-age
- Use `SameSite=Strict` for session cookies; `SameSite=Lax` for cross-site navigation cookies
- Run `composer audit` and automated dependency scanning in CI

## Forbidden

- `mysql_*` functions — use PDO or MySQLi with prepared statements exclusively
- `$_GET`, `$_POST`, `$_REQUEST` used directly without validation and sanitization
- `eval()`, `assert()` with strings, `preg_replace` with `/e` modifier, or `create_function()`
- `serialize()`/`unserialize()` on user input — use `json_encode()`/`json_decode()` instead
- `extract($_POST)` or `extract($_GET)` — it creates variables from user input
- `include` or `require` with user-controlled paths — prevents local/remote file inclusion
- Storing passwords with `md5()`, `sha1()`, or any unsalted algorithm

## Examples

```php
<?php
// Good: Prepared statement with PDO
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');
$stmt->execute(['email' => $email]);
$user = $stmt->fetch();

// Bad: SQL injection vulnerability
$result = $pdo->query("SELECT * FROM users WHERE email = '$email'");

// Good: Proper password handling
$hash = password_hash($password, PASSWORD_ARGON2ID);
if (password_verify($input, $hash)) { /* authenticated */ }

// Bad: Insecure hashing
$hash = md5($password);

// Good: Output escaping
echo htmlspecialchars($userInput, ENT_QUOTES, 'UTF-8');

// Bad: Raw output (XSS vulnerability)
echo $userInput;

// Good: Secure file upload
$allowedTypes = ['image/jpeg', 'image/png'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($_FILES['upload']['tmp_name']);
if (!in_array($mimeType, $allowedTypes, true)) {
    throw new InvalidArgumentException('Invalid file type');
}

// Bad: Trusting user-provided MIME type
$type = $_FILES['upload']['type'];  // User-controlled, not reliable
```
