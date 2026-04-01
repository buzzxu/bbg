# React: TypeScript

Rules for React applications written in TypeScript.

## Mandatory

- Define component props with `interface` — export them for reuse
- Always provide a stable, unique `key` prop on list items — never use array index
- Lift state up only to the nearest common ancestor — avoid prop drilling beyond 2 levels
- Use `React.FC` sparingly — prefer plain function declarations with typed props
- Handle loading, error, and empty states explicitly in every data-fetching component
- Use `useCallback` and `useMemo` only when there is a measured performance problem
- Custom hooks must start with `use` and be pure functions of their inputs

## Recommended

- Prefer server components for data fetching; client components only for interactivity
- Use `React.memo` only when profiling shows unnecessary re-renders — measure first
- Prefer `useReducer` over `useState` when state transitions are complex (>3 related states)
- Co-locate component, styles, tests, and types in the same directory
- Use Context for truly global concerns (theme, locale, auth) — not for all shared state
- Prefer Zustand, Jotai, or TanStack Query over Redux for new projects
- Use `Suspense` boundaries for async component trees
- Implement error boundaries at route/feature level — not around every component

## Forbidden

- Inline object/array literals as props — they create new references every render
- Calling hooks conditionally or inside loops — hooks must be at the top level
- Direct DOM manipulation with `document.querySelector` — use refs instead
- Business logic inside components — extract to hooks or utility functions
- `dangerouslySetInnerHTML` without sanitization (use DOMPurify or equivalent)
- `useEffect` for derived state — compute it during render instead
- Barrel exports in component libraries — they prevent tree-shaking

## Examples

```tsx
// Good: Typed props, explicit states
interface UserListProps {
  readonly userIds: readonly string[];
}

function UserList({ userIds }: UserListProps) {
  const { data, isLoading, error } = useUsers(userIds);
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;
  if (data.length === 0) return <EmptyState />;
  return <ul>{data.map(u => <UserCard key={u.id} user={u} />)}</ul>;
}

// Bad: Index key, no loading state
function UserList({ ids }) {
  const users = useUsers(ids);
  return <ul>{users.map((u, i) => <li key={i}>{u.name}</li>)}</ul>;
}
```


## Related

- **Agents**: [typescript-reviewer](../../agents/typescript-reviewer.md)
- **Skills**: [react-patterns](../../skills/react-patterns/SKILL.md), [frontend-patterns](../../skills/frontend-patterns/SKILL.md)
- **Commands**: [/ts-review](../../commands/ts-review.md)
