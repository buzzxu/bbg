---
name: frontend-patterns
category: frontend
description: Frontend architecture — component design, state management, routing, code splitting, and SSR/SSG
---

# Frontend Patterns

## Overview
Load this skill when building or reviewing frontend applications. These patterns apply broadly across React, Vue, Svelte, and other component-based frameworks. They focus on architecture decisions that impact maintainability, performance, and user experience.

## Patterns

### Component Design
- **Presentational components**: receive data via props, render UI, emit events — no side effects
- **Container components**: manage state, fetch data, pass to presentational children
- **Composition over inheritance**: use hooks/composables, not class inheritance
- Keep components small: under 100 lines of template + logic
- One component per file — named after what it renders (`UserProfile`, `OrderList`)

### Component API Design
- Props: typed, required by default, documented with JSDoc
- Events: named with past tense verbs (`onItemSelected`, `onFormSubmitted`)
- Slots/children: use for flexible composition, not for required content
- Expose minimum API — components should be easy to use correctly and hard to misuse
- Default props should produce a working component

### State Management
```
Local state     → useState/ref — component-specific, not shared
Lifted state    → parent component — shared between siblings
Context/provide → React Context/Vue provide — shared across subtree
Global store    → Redux/Pinia/Zustand — application-wide, persisted
Server state    → React Query/SWR/TanStack — cached API responses
URL state       → Router params/search — shareable, bookmarkable
```
- Use the simplest level that satisfies the requirement
- Never put derived state in the store — compute it
- Server state is not client state — use dedicated tools (React Query, SWR)

### Data Fetching
- Fetch in container components or route loaders — not in presentational components
- Show loading states immediately — never leave the user staring at a blank screen
- Handle errors explicitly: display error UI, offer retry
- Cache responses and deduplicate in-flight requests
- Prefetch data for likely next navigations

### Code Splitting
- Split at route boundaries: each page is a lazy-loaded chunk
- Split heavy dependencies: chart libraries, editors, PDF renderers
- Use dynamic import: `const Chart = lazy(() => import('./Chart'))`
- Preload critical chunks: `<link rel="preload">` for above-the-fold content
- Monitor bundle sizes in CI — alert on size regressions

### Routing
- URL reflects application state — every view is bookmarkable
- Use nested routes for layout inheritance
- Protected routes: check auth before rendering, redirect to login
- 404 handling: catch-all route with helpful "not found" page
- Use route-level code splitting for initial load performance

### SSR/SSG Strategy
- **SSG (Static Site Generation)**: content that rarely changes — marketing, docs, blog
- **SSR (Server-Side Rendering)**: dynamic content needing SEO — product pages, profiles
- **CSR (Client-Side Rendering)**: authenticated dashboards, interactive tools
- **ISR (Incremental Static Regen)**: SSG with periodic refresh — best of both worlds
- Choose per-route: not every page needs the same rendering strategy

### Performance
- Measure with Lighthouse and Core Web Vitals (LCP, FID, CLS)
- Optimize images: use modern formats (WebP/AVIF), lazy-load below-fold images
- Minimize layout shifts: set explicit dimensions on images and embeds
- Virtualize long lists: render only visible items (react-virtual, vue-virtual-scroller)
- Debounce expensive operations: search inputs, scroll handlers, resize observers

## Rules
- Every component must have typed props
- Every async operation must have loading, error, and success states
- Never fetch data in presentational components
- Never store derived state — compute it from source state
- URL must reflect view state — no invisible application states
- Bundle size must be monitored in CI

## Anti-patterns
- Prop drilling through 5+ levels — use context or state management
- Global state for everything — most state should be local or server-cached
- Fetching in useEffect without cleanup — causes race conditions
- Inline styles for layout — use CSS modules or utility classes
- Mega-components (500+ lines) that do everything
- Client-side fetching when SSR/SSG would provide better UX and SEO

## Checklist
- [ ] Components are small, typed, and single-purpose
- [ ] State management uses the simplest appropriate level
- [ ] Data fetching has loading, error, and success states
- [ ] Routes are code-split at page boundaries
- [ ] Rendering strategy (SSR/SSG/CSR) chosen per route
- [ ] Core Web Vitals within acceptable thresholds
- [ ] Bundle size monitored with regression alerts
- [ ] No derived state stored — all computed from source


## Related

- **Agents**: [typescript-reviewer](../../agents/typescript-reviewer.md)
- **Rules**: [typescript/react](../../rules/typescript/react.md)
