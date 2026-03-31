# BBG Rules Directory

Structured governance rules for AI coding agents, organized by language and concern.

## Structure

```
rules/
├── common/          # Language-agnostic rules (always apply)
│   ├── coding-style.md
│   ├── git-workflow.md
│   ├── testing.md
│   ├── security.md
│   ├── performance.md
│   ├── patterns.md
│   ├── hooks.md
│   └── agents.md
├── typescript/      # TypeScript-specific rules
│   ├── coding-style.md
│   ├── testing.md
│   ├── react.md
│   ├── node.md
│   └── security.md
├── python/          # Python-specific rules
│   ├── coding-style.md
│   ├── testing.md
│   ├── django.md
│   └── security.md
├── golang/          # Go-specific rules
│   ├── coding-style.md
│   ├── testing.md
│   ├── patterns.md
│   └── security.md
├── java/            # Java-specific rules
│   ├── coding-style.md
│   ├── testing.md
│   ├── spring.md
│   └── security.md
├── rust/            # Rust-specific rules
│   ├── coding-style.md
│   ├── testing.md
│   └── security.md
├── kotlin/          # Kotlin-specific rules
│   ├── coding-style.md
│   ├── testing.md
│   └── security.md
└── php/             # PHP-specific rules
    ├── coding-style.md
    ├── testing.md
    └── security.md
```

## How Rules Are Applied

1. **common/** rules apply to ALL projects regardless of language
2. **Language-specific** rules layer on top when that language is detected
3. Rules are additive — language rules never override common rules

## Rule File Format

Each rule file follows a consistent structure:

- **Mandatory** — Must always be followed; violations block commits
- **Recommended** — Should be followed; deviations require justification
- **Forbidden** — Anti-patterns that must never appear in code
- **Examples** — Concrete good/bad code samples

## Installation

These rules are loaded automatically by BBG when the CLI detects a project.
To manually reference rules in your agent config:

```yaml
rules:
  - rules/common/*.md
  - rules/typescript/*.md  # or your language
```

## Adding New Rules

1. Place the file in the appropriate `rules/<language>/` directory
2. Follow the mandatory/recommended/forbidden/examples format
3. Keep each file between 40-80 lines
4. Run `bbg doctor` to validate rule consistency
