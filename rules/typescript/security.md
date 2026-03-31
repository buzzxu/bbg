# Security: TypeScript

TypeScript and JavaScript-specific security rules for web and Node.js applications.

## Mandatory

- Sanitize all HTML output to prevent XSS — use DOMPurify or equivalent before rendering
- Never use `dangerouslySetInnerHTML`, `innerHTML`, or `document.write` with user content
- Set Content-Security-Policy headers: restrict `script-src`, `style-src`, `connect-src`
- Validate JWTs on every request: check signature, expiration, issuer, and audience claims
- Store tokens in httpOnly, secure, sameSite cookies — never in localStorage or sessionStorage
- Configure CORS explicitly — never use `origin: "*"` with credentials
- Freeze configuration objects with `Object.freeze()` to prevent prototype pollution
- Use `zod`, `valibot`, or `ajv` for runtime input validation at API boundaries

## Recommended

- Use `helmet` middleware to set security headers in Express/Fastify applications
- Implement rate limiting with `express-rate-limit` or equivalent at the API gateway
- Use `crypto.timingSafeEqual()` for comparing secrets — prevents timing attacks
- Sanitize user input before using in `RegExp` constructors — prevent ReDoS attacks
- Use Subresource Integrity (SRI) hashes for all CDN-loaded scripts and styles
- Prefer `URL` constructor over string manipulation for URL building and parsing
- Use `Proxy` or `Object.create(null)` for dictionary objects to avoid prototype chain issues
- Audit npm packages regularly: `npm audit`, Socket.dev, or Snyk

## Forbidden

- `eval()`, `new Function()`, `setTimeout(string)` — never execute dynamic strings as code
- Storing secrets in client-side JavaScript — any value in the bundle is public
- `innerHTML = userInput` — always sanitize or use `textContent` for plain text
- Disabling CSRF protection — use anti-CSRF tokens for all state-changing requests
- `node_modules` in Docker images — use multi-stage builds with production dependencies only
- Trusting `X-Forwarded-For` without proxy validation — configure trusted proxies explicitly

## Examples

```typescript
// Good: Runtime validation at API boundary
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});
app.post("/users", (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid input" });
  createUser(result.data);
});

// Bad: No validation
app.post("/users", (req, res) => {
  createUser(req.body);
});

// Good: Timing-safe comparison
import { timingSafeEqual } from "node:crypto";
const isValid = timingSafeEqual(Buffer.from(token), Buffer.from(expected));

// Bad: Direct comparison (vulnerable to timing attacks)
const isValid = token === expected;
```
