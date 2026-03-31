---
name: ktor-patterns
category: kotlin
description: Ktor patterns including routing, plugins, content negotiation, authentication, and WebSocket support
---

# Ktor Patterns

## Overview

Use this skill when building or reviewing Ktor server applications. These patterns cover the plugin system, routing DSL, content negotiation, authentication pipelines, and WebSocket communication.

## Key Patterns

### Application Setup with Plugins

```kotlin
fun main() {
    embeddedServer(Netty, port = 8080) {
        configurePlugins()
        configureRouting()
    }.start(wait = true)
}

fun Application.configurePlugins() {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = false
            isLenient = false
            ignoreUnknownKeys = true
        })
    }
    install(StatusPages) {
        exception<NotFoundException> { call, cause ->
            call.respond(HttpStatusCode.NotFound, ErrorResponse(cause.message ?: "Not found"))
        }
        exception<Throwable> { call, cause ->
            application.log.error("Unhandled error", cause)
            call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Internal error"))
        }
    }
    install(CallLogging) {
        level = Level.INFO
        filter { call -> call.request.path().startsWith("/api") }
    }
}
```

### Routing DSL

```kotlin
fun Application.configureRouting() {
    routing {
        route("/api/v1") {
            userRoutes()
            orderRoutes()
        }
    }
}

fun Route.userRoutes() {
    val userService by inject<UserService>() // Koin DI

    route("/users") {
        get {
            val page = call.queryParameters["page"]?.toIntOrNull() ?: 1
            val users = userService.listUsers(page)
            call.respond(users)
        }
        get("/{id}") {
            val id = call.parameters["id"] ?: throw BadRequestException("Missing id")
            val user = userService.getUser(id) ?: throw NotFoundException("User $id not found")
            call.respond(user)
        }
        post {
            val request = call.receive<CreateUserRequest>()
            val user = userService.createUser(request)
            call.respond(HttpStatusCode.Created, user)
        }
        delete("/{id}") {
            val id = call.parameters["id"] ?: throw BadRequestException("Missing id")
            userService.deleteUser(id)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
```

### Request Validation

```kotlin
@Serializable
data class CreateUserRequest(
    val name: String,
    val email: String,
    val age: Int,
) {
    init {
        require(name.isNotBlank()) { "Name must not be blank" }
        require("@" in email) { "Invalid email format" }
        require(age in 0..150) { "Age must be between 0 and 150" }
    }
}

// Or with a validation plugin
install(RequestValidation) {
    validate<CreateUserRequest> { request ->
        val errors = buildList {
            if (request.name.isBlank()) add("Name is required")
            if ("@" !in request.email) add("Invalid email")
        }
        if (errors.isEmpty()) ValidationResult.Valid
        else ValidationResult.Invalid(errors)
    }
}
```

### Authentication

```kotlin
fun Application.configureAuth() {
    install(Authentication) {
        jwt("auth-jwt") {
            realm = "my-app"
            verifier(
                JWT.require(Algorithm.HMAC256(environment.config.property("jwt.secret").getString()))
                    .withIssuer("my-app")
                    .build()
            )
            validate { credential ->
                if (credential.payload.getClaim("userId").asString() != null) {
                    JWTPrincipal(credential.payload)
                } else null
            }
            challenge { _, _ ->
                call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Token is invalid or expired"))
            }
        }
    }
}

// Protected routes
routing {
    authenticate("auth-jwt") {
        get("/me") {
            val principal = call.principal<JWTPrincipal>()!!
            val userId = principal.payload.getClaim("userId").asString()
            call.respond(userService.getUser(userId)!!)
        }
    }
}
```

### WebSocket

```kotlin
fun Application.configureWebSocket() {
    install(WebSockets) {
        pingPeriod = Duration.ofSeconds(15)
        timeout = Duration.ofSeconds(30)
        maxFrameSize = Long.MAX_VALUE
    }

    routing {
        val connections = Collections.synchronizedSet(mutableSetOf<WebSocketSession>())

        webSocket("/ws/chat") {
            connections += this
            try {
                for (frame in incoming) {
                    if (frame is Frame.Text) {
                        val text = frame.readText()
                        connections.forEach { session ->
                            session.send(Frame.Text("[${call.request.origin.remoteHost}]: $text"))
                        }
                    }
                }
            } finally {
                connections -= this
            }
        }
    }
}
```

## Best Practices

- Use Kotlin Serialization with `ContentNegotiation` for type-safe JSON handling
- Install `StatusPages` plugin for centralized error handling
- Organize routes into extension functions on `Route` — one file per resource
- Use `authenticate` blocks to group protected routes
- Use constructor injection (Koin, Kodein) for service dependencies in routes
- Configure timeouts and limits on WebSocket connections

## Anti-patterns

- Catching all exceptions inside route handlers — use `StatusPages` plugin
- Mixing business logic into route definitions — delegate to service classes
- Using blocking I/O in coroutine context — use `withContext(Dispatchers.IO)`
- Hardcoding configuration — use `application.conf` (HOCON) or environment variables
- Forgetting to handle WebSocket disconnection — always use try/finally

## Testing Strategy

- Use `testApplication` DSL for integration tests without starting a real server
- Test routes with `client.get("/api/users")` and assert JSON responses
- Test authentication by sending valid/invalid JWT tokens
- Test WebSocket endpoints with `client.webSocket` in test scope
- Mock services with MockK when testing routes in isolation
