---
name: docker-patterns
category: devops
description: Docker best practices — multi-stage builds, security scanning, compose networking, and volume management
---

# Docker Patterns

## Overview
Load this skill when writing Dockerfiles, configuring Docker Compose, or debugging container issues. These patterns produce small, secure, and reproducible container images.

## Patterns

### Multi-Stage Build
Separate build dependencies from runtime — smaller, more secure images:
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Image Optimization
- Use Alpine-based images — 5MB vs 900MB for full Debian
- Order layers by change frequency: OS → deps → config → code
- Use `.dockerignore`: exclude `node_modules`, `.git`, `tests`, docs
- Pin exact versions: `node:20.11.0-alpine` not `node:latest`
- Use `npm ci` (not `npm install`) for deterministic builds
- Remove dev dependencies in production: `npm ci --omit=dev`

### Layer Caching Strategy
```dockerfile
# These change rarely — cached
COPY package.json package-lock.json ./
RUN npm ci

# This changes frequently — invalidates only this layer and below
COPY src/ ./src/
RUN npm run build
```
- Copy dependency manifests before source code
- Separate `npm ci` from code copy to cache dependencies
- Move infrequent changes to earlier layers

### Security
- Never run as root — create and switch to a non-root user
- Never store secrets in images — use runtime environment variables or secrets management
- Scan images: `docker scout cves <image>` or Trivy/Snyk
- Use `COPY` not `ADD` — ADD can unpack tarballs and fetch URLs unexpectedly
- Set read-only filesystem where possible: `--read-only`
- Drop all capabilities: `--cap-drop=ALL`, add back only what's needed

### Docker Compose Networking
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"    # host:container
    networks:
      - frontend
      - backend
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  frontend:
  backend:
    internal: true   # No external access

volumes:
  pgdata:
```
- Use named networks to isolate services — don't use default bridge
- Mark backend networks as `internal` — no external access
- Use `depends_on` with health checks — not just startup order
- Services communicate by service name (DNS resolution within network)

### Volume Management
- **Named volumes**: persistent data (databases, uploads) — managed by Docker
- **Bind mounts**: development only — mount source code for live reload
- **tmpfs**: temporary data — in-memory, lost on container restart
- Never use anonymous volumes in production — they accumulate and are hard to manage
- Backup strategy: `docker run --volumes-from db -v $(pwd):/backup alpine tar czf /backup/db.tar.gz /data`

### Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```
- Every production container must have a health check
- Check the application, not just the process
- Use wget or curl — don't install unnecessary tools (use wget in Alpine)

## Rules
- Every Dockerfile must use multi-stage builds for production
- Every container must run as a non-root user
- Every image must be scanned for vulnerabilities before deployment
- Every production container must have a health check
- Pin all base image versions — never use `latest` tag
- Use `.dockerignore` to exclude unnecessary files

## Anti-patterns
- Running as root in production containers
- Using `latest` tag — builds are not reproducible
- Storing secrets in Dockerfile or image layers
- Single-stage builds with build tools in production image
- No health checks — orchestrators can't manage unhealthy containers
- Using `ADD` when `COPY` suffices
- Not using `.dockerignore` — bloated images with test files and git history

## Checklist
- [ ] Multi-stage build separates build from runtime
- [ ] Non-root user configured
- [ ] Base images pinned to exact versions
- [ ] `.dockerignore` excludes unnecessary files
- [ ] No secrets in Dockerfile or image layers
- [ ] Health check configured
- [ ] Image scanned for vulnerabilities
- [ ] Compose uses named networks with proper isolation
- [ ] Volumes use named volumes for persistent data


## Related

- **Agents**: [devops-reviewer](../../agents/devops-reviewer.md)
