---
name: react-patterns
category: typescript
description: React patterns including hooks, context, suspense, server components, error boundaries, memoization, and render optimization
---

# React Patterns

## Overview

Use this skill when building or reviewing React applications. These patterns address component design, state management, performance, and the React 18+ server/client architecture split.

## Key Patterns

### Custom Hooks — Encapsulate Stateful Logic

```tsx
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// Usage
const query = useDebounce(rawInput, 300);
```

### Context with Selector Pattern

Avoid re-renders by splitting context or using a selector:

```tsx
const ThemeContext = createContext<Theme | null>(null);

function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// Split large contexts into separate providers (ThemeCtx, AuthCtx, etc.)
```

### Error Boundaries

```tsx
class ErrorBoundary extends Component<PropsWithChildren<{ fallback: ReactNode }>> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, info);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// Wrap at route or feature boundaries, not around every component
```

### Suspense for Data Fetching

```tsx
function UserProfile({ userId }: { userId: string }) {
  const user = use(fetchUser(userId)); // React 19 `use` hook
  return <h1>{user.name}</h1>;
}

// Parent provides the boundary
<Suspense fallback={<Skeleton />}>
  <UserProfile userId={id} />
</Suspense>
```

### Server Components (RSC)

```tsx
// app/users/page.tsx — Server Component by default (no "use client")
export default async function UsersPage() {
  const users = await db.users.findMany(); // direct DB access, zero bundle
  return <UserList users={users} />;
}

// components/LikeButton.tsx — Client Component
"use client";
export function LikeButton({ id }: { id: string }) {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>♥</button>;
}
```

### Render Optimization

```tsx
// Memoize expensive computations
const sorted = useMemo(() => items.toSorted(compareFn), [items]);

// Memoize callbacks passed to children
const handleClick = useCallback((id: string) => select(id), [select]);

// Memoize components that receive stable props
const Row = memo(function Row({ item }: { item: Item }) {
  return <div>{item.name}</div>;
});
```

## Best Practices

- Keep components small (<80 lines); extract logic into custom hooks
- Co-locate hooks, types, and tests with the component file
- Use server components by default; add `"use client"` only when interactivity is needed
- Prefer composition (`children` prop) over deeply nested component hierarchies
- Use `key` props on list items with stable, unique identifiers — never array indices
- Lift state up only as far as necessary; prefer local state

## Anti-patterns

- Putting all state in a single global context — causes unnecessary re-renders
- Using `useEffect` for derived state — use `useMemo` or compute inline instead
- Suppressing `useEffect` dependency warnings with `eslint-disable`
- Creating new object/array literals in render without memoization
- Fetching data inside `useEffect` without cancellation or race-condition handling

## Testing Strategy

- Use React Testing Library — test behavior, not implementation details
- Query by accessible role/label, not test IDs or class names
- Use `renderHook` from `@testing-library/react` for custom hook tests
- Mock network calls with `msw` (Mock Service Worker), not by mocking `fetch`
- Test error boundaries by throwing from a child and asserting fallback renders
