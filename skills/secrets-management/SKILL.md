---
name: secrets-management
category: security
description: Secrets management covering vault integration, environment variables, rotation policies, .env safety, and git-secrets/pre-commit hooks
---

# Secrets Management

## Overview
Load this skill when handling API keys, database credentials, tokens, certificates, or any sensitive configuration. Leaked secrets are the most common source of production breaches — prevention is straightforward but requires discipline at every layer.

## Key Patterns

### Secret Types and Risk Levels
| Type | Risk | Rotation Frequency |
|------|------|-------------------|
| Database credentials | Critical — full data access | Every 90 days |
| API keys (external services) | High — financial or data exposure | Every 90 days |
| JWT signing keys | Critical — full auth bypass | Every 180 days or on compromise |
| TLS certificates | High — MITM if expired/compromised | Before expiry (automate with ACME) |
| OAuth client secrets | High — impersonation | Every 90 days |
| Encryption keys | Critical — data confidentiality | Annually; use key versioning |

### Vault Integration
- Use a centralized secrets manager: HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault
- Applications authenticate to vault using identity-based auth (IAM roles, Kubernetes service accounts) — no bootstrap secrets
- Retrieve secrets at runtime — never bake them into container images or config files
- Enable audit logging on all secret access for forensic capability
- Use dynamic secrets where possible — vault generates short-lived credentials on demand

### Environment Variable Handling
- Inject secrets as environment variables via the deployment platform (K8s secrets, ECS task definitions)
- Never pass secrets as CLI arguments — they appear in process listings and shell history
- Validate required environment variables at application startup — fail fast with clear error messages
- Use typed configuration objects — parse and validate env vars once at boot, reference the typed object thereafter
- In development, use `.env` files loaded by dotenv — never commit them

### .env File Safety
- Add `.env` to `.gitignore` before creating the file — order matters
- Provide `.env.example` with placeholder values — document every required variable
- Never put real secrets in `.env.example` — use descriptive placeholders like `your-api-key-here`
- Audit git history for accidentally committed `.env` files: `git log --all --full-history -- .env`
- If a `.env` file was ever committed, rotate all secrets it contained immediately

### Pre-commit Secret Detection
- Install `gitleaks` or `trufflehog` as a pre-commit hook to catch secrets before they enter history
- Configure in `.pre-commit-config.yaml` or as a git hook in `.git/hooks/pre-commit`
- Run secret scanning in CI as a safety net — pre-commit hooks can be bypassed
- Maintain a `.gitleaksignore` for known false positives with justification comments
- Scan the entire git history periodically — secrets may have been committed before hooks were added

### Secret Rotation
- Automate rotation — manual processes are forgotten and deferred
- Use dual-credential rotation: provision new credential → update consumers → revoke old credential
- Zero-downtime rotation requires the application to accept both old and new credentials during transition
- Log rotation events — who rotated, when, and confirmation of successful consumer update
- Test rotation procedure in staging before executing in production

## Best Practices
- Least privilege — each service gets only the secrets it needs, nothing more
- Encrypt secrets at rest and in transit — vault storage, TLS for retrieval
- Never log secrets — redact sensitive fields in log output; search existing logs for leaks
- Separate secrets by environment — development, staging, and production use different credentials
- Document every secret: what it is for, who owns it, when it was last rotated
- Treat secret compromise as a SEV1 incident — rotate immediately, audit access logs

## Anti-patterns
- Hardcoding secrets in source code, even "temporarily"
- Sharing secrets via Slack, email, or unencrypted documents
- Using the same credentials across development, staging, and production
- Storing secrets in environment variables in Docker Compose files committed to git
- Never rotating credentials — leaked keys from years ago still grant access
- Disabling pre-commit hooks because they are "annoying"

## Checklist
- [ ] All secrets stored in a centralized secrets manager, not in code or config files
- [ ] `.env` is in `.gitignore`; `.env.example` has only placeholder values
- [ ] Pre-commit secret scanning hook installed (gitleaks or trufflehog)
- [ ] CI pipeline includes secret scanning as a blocking check
- [ ] Git history audited for previously committed secrets
- [ ] Secret rotation schedule defined and automated
- [ ] Each environment uses separate credentials
- [ ] Application validates required secrets at startup with clear error messages
- [ ] Secrets access is audit-logged in the vault
- [ ] Incident response plan covers secret compromise scenarios


## Related

- **Agents**: [security-reviewer](../../agents/security-reviewer.md)
- **Rules**: [security](../../rules/common/security.md)
