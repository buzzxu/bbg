---
name: e2e-testing
category: testing
description: End-to-end testing with Playwright — Page Object Model, test isolation, visual regression, and CI integration
---

# E2E Testing

## Overview
Load this skill when writing, reviewing, or debugging end-to-end tests. E2E tests verify that the full application works from the user's perspective. They are the most expensive tests to write and maintain, so they must be well-structured and targeted.

## Workflow
1. **Identify critical flows** — login, checkout, core CRUD operations
2. **Design page objects** — abstract page interactions into reusable classes
3. **Write tests** — one user flow per test, isolated and independent
4. **Run in CI** — headless, with retries, artifacts on failure
5. **Maintain** — update locators and flows as the UI evolves

## Patterns

### Page Object Model (POM)
Encapsulate page interactions in classes — tests read like user stories:
```typescript
class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }

  async expectError(message: string) {
    await expect(this.page.getByRole('alert')).toHaveText(message);
  }
}
```
- One page object per page or major component
- Methods return page objects for chaining: `login()` returns `DashboardPage`
- Locators are encapsulated — if UI changes, update only the page object

### Locator Strategy (Priority Order)
1. `getByRole` — most resilient, matches how users see the page
2. `getByLabel` — for form elements with accessible labels
3. `getByText` — for buttons, links, headings
4. `getByTestId` — last resort, add `data-testid` attributes when needed
- Never use CSS selectors or XPath for locators — they break on refactors
- Never use auto-generated class names (CSS modules, Tailwind) as locators

### Test Isolation
- Each test starts with a clean state — create test data in `beforeEach`
- Use API calls for setup/teardown — faster than UI interactions
- Never depend on test execution order
- Use unique test data to prevent collisions in parallel runs
- Clean up: delete created data after tests (or use isolated test databases)

### Test Structure
```typescript
test.describe('Checkout Flow', () => {
  let checkoutPage: CheckoutPage;

  test.beforeEach(async ({ page }) => {
    // Setup via API — fast, reliable
    await api.createUser(testUser);
    await api.addToCart(testProduct);
    checkoutPage = new CheckoutPage(page);
    await checkoutPage.goto();
  });

  test('should complete purchase with valid payment', async () => {
    await checkoutPage.fillShipping(testAddress);
    await checkoutPage.fillPayment(testCard);
    await checkoutPage.submit();
    await checkoutPage.expectConfirmation();
  });
});
```

### Visual Regression Testing
- Capture screenshots of key states (empty, loaded, error)
- Compare against approved baselines using pixel or structural diff
- Set tolerance for minor rendering differences (anti-aliasing, font rendering)
- Run on a consistent environment (Docker) to avoid platform differences
- Review and approve visual changes explicitly — don't auto-approve

### CI Configuration
- Run headless in CI with consistent browser versions
- Configure retries (2-3) to handle flaky infrastructure
- Capture artifacts on failure: screenshots, videos, traces
- Shard tests across multiple workers for parallel execution
- Set reasonable timeouts: 30s per test, 10min per suite
- Run on every PR and nightly on the main branch

## Rules
- Only test critical user flows — don't duplicate unit test coverage
- Always use Page Object Model — never write locators directly in tests
- Use accessible locators (role, label, text) before test IDs
- Every test must be independent — no shared state between tests
- Setup via API, verify via UI — fastest reliable pattern

## Anti-patterns
- Testing every minor UI detail with E2E — use unit/component tests instead
- Hardcoded waits (`page.waitForTimeout(3000)`) — use `waitFor` conditions
- Tests that depend on execution order or shared state
- CSS selectors as locators (`div.container > span.title`)
- Ignoring flaky tests instead of fixing them
- No artifacts on failure — makes debugging impossible

## Checklist
- [ ] Critical user flows identified and covered
- [ ] Page Object Model used for all page interactions
- [ ] Accessible locators used (role, label, text)
- [ ] Tests are independent with API-based setup
- [ ] CI runs headless with retries and artifact capture
- [ ] Visual regression baselines reviewed and approved
- [ ] No hardcoded waits — all waits are condition-based
- [ ] Test suite completes within acceptable time limits
