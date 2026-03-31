---
name: vue-patterns
category: typescript
description: Vue 3 patterns including Composition API, composables, Pinia state management, teleport, suspense, and provide/inject
---

# Vue 3 Patterns

## Overview

Use this skill when building or reviewing Vue 3 applications with the Composition API. These patterns emphasize type-safe reactivity, reusable composables, and the modern Vue ecosystem.

## Key Patterns

### Composition API with `<script setup>`

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

interface User {
  id: string;
  name: string;
  email: string;
}

const users = ref<User[]>([]);
const search = ref("");

const filtered = computed(() =>
  users.value.filter(u => u.name.toLowerCase().includes(search.value.toLowerCase()))
);

onMounted(async () => {
  const res = await fetch("/api/users");
  users.value = await res.json();
});
</script>

<template>
  <input v-model="search" placeholder="Search users..." />
  <ul>
    <li v-for="user in filtered" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
```

### Composables — Reusable Stateful Logic

```typescript
// composables/useFetch.ts
import { ref, watchEffect, type Ref } from "vue";

export function useFetch<T>(url: Ref<string> | string) {
  const data = ref<T | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(false);

  watchEffect(async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(typeof url === "string" ? url : url.value);
      data.value = await res.json();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  });

  return { data, error, loading };
}
```

### Pinia State Management

```typescript
// stores/auth.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  async function login(credentials: Credentials) {
    const res = await api.login(credentials);
    user.value = res.user;
    token.value = res.token;
  }

  function logout() {
    user.value = null;
    token.value = null;
  }

  return { user, token, isAuthenticated, login, logout };
});
```

### Provide/Inject for Dependency Injection

```typescript
// keys.ts
import type { InjectionKey } from "vue";
const ThemeKey: InjectionKey<Ref<"light" | "dark">> = Symbol("theme");

// parent component
const theme = ref<"light" | "dark">("light");
provide(ThemeKey, theme);

// child component — any depth
const theme = inject(ThemeKey);
if (!theme) throw new Error("ThemeKey not provided");
```

### Teleport — Render Outside Component Tree

```vue
<template>
  <button @click="showModal = true">Open</button>
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <slot />
        <button @click="showModal = false">Close</button>
      </div>
    </div>
  </Teleport>
</template>
```

### Async Components with Suspense

```vue
<script setup>
import { defineAsyncComponent } from "vue";
const HeavyChart = defineAsyncComponent(() => import("./HeavyChart.vue"));
</script>

<template>
  <Suspense>
    <HeavyChart :data="chartData" />
    <template #fallback>
      <div class="skeleton">Loading chart...</div>
    </template>
  </Suspense>
</template>
```

## Best Practices

- Use `<script setup>` for all new components — less boilerplate, better type inference
- Prefix composables with `use` and store them in `composables/` directory
- Use Pinia setup stores (function syntax) for full TypeScript support
- Prefer `computed` over watchers for derived state
- Use `shallowRef` for large objects that replace entirely rather than mutate
- Type injection keys with `InjectionKey<T>` for type-safe provide/inject

## Anti-patterns

- Mutating props directly — use `emit` to communicate changes upward
- Overusing watchers when `computed` properties suffice
- Large monolithic components — extract logic into composables
- Using Options API and Composition API in the same component
- Global mutable state outside of Pinia stores

## Testing Strategy

- Use `@vue/test-utils` with `mount` / `shallowMount` for component tests
- Test composables by calling them inside a `withSetup` helper or simple component
- Test Pinia stores independently with `createPinia()` and `setActivePinia()`
- Use `flushPromises()` to resolve async operations in tests
- Test emitted events with `wrapper.emitted()` assertions
