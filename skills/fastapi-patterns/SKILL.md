---
name: fastapi-patterns
category: python
description: FastAPI patterns including dependency injection, Pydantic models, background tasks, middleware, and WebSocket support
---

# FastAPI Patterns

## Overview

Use this skill when building or reviewing FastAPI applications. These patterns cover the dependency injection system, Pydantic v2 models, async architecture, and real-time communication.

## Key Patterns

### Pydantic Models for Request/Response

```python
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    age: int = Field(ge=0, le=150)

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}  # Pydantic v2 ORM mode
```

### Dependency Injection

```python
from fastapi import Depends, HTTPException, status
from typing import Annotated

async def get_db() -> AsyncIterator[AsyncSession]:
    async with async_session() as session:
        yield session

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    user = await db.get(User, decode_token(token).sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

@app.get("/me", response_model=UserResponse)
async def read_me(user: CurrentUser):
    return user
```

### Router Organization

```python
# routers/users.py
from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=list[UserResponse])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = Query(default=20, le=100),
):
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()

# main.py
app = FastAPI()
app.include_router(users.router)
app.include_router(orders.router)
```

### Background Tasks

```python
from fastapi import BackgroundTasks

async def send_welcome_email(email: str) -> None:
    await email_client.send(to=email, template="welcome")

@router.post("/users", status_code=201)
async def create_user(
    body: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    tasks: BackgroundTasks,
):
    user = User(**body.model_dump())
    db.add(user)
    await db.commit()
    tasks.add_task(send_welcome_email, user.email)
    return user
```

### Middleware

```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time, logging

logger = logging.getLogger(__name__)

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.monotonic()
        response = await call_next(request)
        duration = time.monotonic() - start
        response.headers["X-Process-Time"] = f"{duration:.4f}"
        logger.info(f"{request.method} {request.url.path} {response.status_code} {duration:.3f}s")
        return response

app.add_middleware(TimingMiddleware)
```

### WebSocket

```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    async def broadcast(self, message: str):
        for conn in self.connections:
            await conn.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/chat")
async def chat(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            await manager.broadcast(f"Message: {data}")
    except WebSocketDisconnect:
        manager.connections.remove(ws)
```

## Best Practices

- Use `Annotated[T, Depends(...)]` for reusable dependency types
- Separate request/response models — never expose internal ORM models directly
- Use `response_model` on every endpoint to enforce output shape
- Organize routes with `APIRouter` — one router per domain
- Use `lifespan` context manager for app startup/shutdown (DB pools, caches)
- Return proper HTTP status codes: 201 for creation, 204 for deletion

## Anti-patterns

- Using sync `def` endpoints with blocking I/O — blocks the event loop
- Putting business logic inside route handlers — extract into service functions
- Catching `Exception` broadly in endpoints — let FastAPI's exception handlers work
- Skipping Pydantic validation by accepting `dict` or `Any` in request bodies
- Not closing DB sessions — always use `Depends` with `yield` for cleanup

## Testing Strategy

- Use `httpx.AsyncClient` with `ASGITransport` for async endpoint tests
- Override dependencies with `app.dependency_overrides` for mocking
- Test WebSocket endpoints with `TestClient` context manager
- Use `factory_boy` or Pydantic factories for test data generation
- Test background tasks by mocking `BackgroundTasks.add_task`


## Related

- **Agents**: [python-reviewer](../../agents/python-reviewer.md)
- **Rules**: [python/coding-style](../../rules/python/coding-style.md)
- **Commands**: [/python-review](../../commands/python-review.md)
