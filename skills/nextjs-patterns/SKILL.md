---
name: nextjs-patterns
category: typescript
description: Next.js patterns including App Router, Server Actions, middleware, ISR/SSG/SSR, route handlers, and parallel routes
---

# Next.js Patterns

## Overview

Use this skill when building or reviewing Next.js 14+ applications. These patterns cover the App Router architecture, rendering strategies, data mutations, and advanced routing features.

## Key Patterns

### App Router File Conventions

```
app/
├── layout.tsx          # Root layout — wraps all pages, persists across navigation
├── page.tsx            # Home route (/)
├── loading.tsx         # Instant loading UI (Suspense boundary)
├── error.tsx           # Error boundary (must be "use client")
├── not-found.tsx       # 404 handler
├── dashboard/
│   ├── page.tsx        # /dashboard
│   ├── @analytics/     # Parallel route slot
│   │   └── page.tsx
│   └── [teamId]/       # Dynamic segment
│       └── page.tsx    # /dashboard/:teamId
```

### Server Actions — Mutations Without API Routes

```tsx
// app/actions.ts
"use server";

import { revalidatePath } from "next/cache";

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  await db.posts.create({ data: { title } });
  revalidatePath("/posts");
}

// app/posts/new/page.tsx — no "use client" needed for form submission
export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

### Rendering Strategies

```tsx
// Static (default) — built at deploy time
export default async function About() {
  return <h1>About</h1>;
}

// ISR — revalidate every 60 seconds
export const revalidate = 60;
export default async function Products() {
  const products = await fetch("https://api.example.com/products",
    { next: { revalidate: 60 } }
  ).then(r => r.json());
  return <ProductList products={products} />;
}

// Dynamic SSR — opt out of caching
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const data = await getAnalytics();
  return <Chart data={data} />;
}
```

### Middleware — Edge Runtime

```typescript
// middleware.ts (project root)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session");
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
```

### Route Handlers (API)

```typescript
// app/api/users/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const users = await db.users.findMany();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  const user = await db.users.create({ data: body });
  return NextResponse.json(user, { status: 201 });
}
```

### Parallel Routes

```tsx
// app/dashboard/layout.tsx
export default function Layout({
  children,
  analytics,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode; // maps to @analytics/ slot
}) {
  return (
    <div className="grid grid-cols-2">
      <main>{children}</main>
      <aside>{analytics}</aside>
    </div>
  );
}
```

## Best Practices

- Keep server components as the default; push `"use client"` to leaf components
- Use `loading.tsx` for instant streaming UI instead of manual loading states
- Prefer Server Actions over API routes for mutations tied to UI
- Use `generateStaticParams` for static generation of dynamic routes
- Set `revalidate` at the fetch level, not globally, for fine-grained caching
- Co-locate related files (page, loading, error) in the same route segment

## Anti-patterns

- Importing server-only code (DB clients, secrets) in client components
- Using `"use client"` at the layout level — makes the entire subtree client-rendered
- Fetching in client components when a server component could provide the data as props
- Overusing `dynamic = "force-dynamic"` — defeats static optimization
- Putting business logic in middleware — it runs on the Edge with limited APIs

## Testing Strategy

- Use `@testing-library/react` for component tests with server component mocking
- Test Server Actions as standalone async functions with mocked DB
- Test middleware with `NextRequest`/`NextResponse` constructors directly
- Use Playwright or Cypress for E2E tests covering SSR and navigation
- Verify caching behavior with integration tests that check response headers
