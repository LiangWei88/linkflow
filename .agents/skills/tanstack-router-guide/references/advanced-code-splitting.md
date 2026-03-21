# Advanced: Code Splitting

TanStack Router separates route code into two categories:

**Critical (always loaded):** Path parsing, search param validation, `beforeLoad`, `loader`, route context, static data, `links`, `scripts`, `head`, `headers`, search middlewares.

**Non-critical (lazy loaded):** `component`, `errorComponent`, `pendingComponent`, `notFoundComponent`.

---

## Automatic Code Splitting (Recommended)

Enable in the bundler plugin configuration. Only available with file-based routing and a supported bundler (not the standalone CLI).

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    react(),
  ],
})
```

The plugin transforms route files at dev time and build time:

1. **Reference file**: The original route file is modified so properties like `component` use lazy-loading wrappers pointing to virtual files.
2. **Virtual file**: The bundler resolves virtual file requests (e.g., `posts.route.tsx?tsr-split=component`) by generating minimal files containing only the requested property.

---

## Split Groupings

Split groupings define how properties are bundled into chunks. The splittable properties are: `component`, `errorComponent`, `pendingComponent`, `notFoundComponent`, `loader`.

Default groupings:

```
[['component'], ['errorComponent'], ['notFoundComponent']]
```

This produces three separate chunks per route. The `pendingComponent` and `loader` stay in the main bundle by default.

### Rules: Do Not Export Route Properties

Route properties (`component`, `loader`, etc.) must not be exported from the route file. Exporting prevents code splitting:

```tsx
// WRONG -- prevents code splitting
export function PostsComponent() { /* ... */ }

// CORRECT -- keep unexported
function PostsComponent() { /* ... */ }
```

---

## Customizing Default Behavior

Bundle all UI components together:

```ts
tanstackRouter({
  autoCodeSplitting: true,
  codeSplittingOptions: {
    defaultBehavior: [
      ['component', 'pendingComponent', 'errorComponent', 'notFoundComponent'],
    ],
  },
})
```

---

## Programmatic Control with `splitBehavior`

Apply custom logic per route based on `routeId`:

```ts
tanstackRouter({
  autoCodeSplitting: true,
  codeSplittingOptions: {
    splitBehavior: ({ routeId }) => {
      if (routeId.startsWith('/posts')) {
        return [['loader', 'component']]
      }
      // Falls back to defaultBehavior for other routes
    },
  },
})
```

---

## Per-Route Overrides with `codeSplitGroupings`

Override splitting directly inside a route file:

```tsx
export const Route = createFileRoute('/posts')({
  codeSplitGroupings: [['loader', 'component']],
  loader: () => loadPostsData(),
  component: PostsComponent,
})
```

### Configuration Precedence

1. Per-route `codeSplitGroupings` (highest priority)
2. `splitBehavior` function
3. `defaultBehavior` (fallback)

---

## Data Loader Splitting

Splitting the loader introduces an additional network round-trip before data can be fetched. This is generally discouraged because:

- The loader is already an async boundary -- splitting adds double latency.
- Loaders are critical preloadable assets (e.g., on link hover).
- Loaders typically contribute less to bundle size than components.

If you still need it:

```ts
codeSplittingOptions: {
  defaultBehavior: [
    ['loader'],     // Loader in its own chunk
    ['component'],
  ],
}
```

---

## Manual Code Splitting with `.lazy.tsx`

Split a route into two files. The root route (`__root.tsx`) does not support code splitting.

```tsx
// src/routes/posts.tsx (critical path)
export const Route = createFileRoute('/posts')({
  validateSearch: z.object({ page: z.number().catch(1) }),
  loader: async () => fetchPosts(),
})

// src/routes/posts.lazy.tsx (non-critical, lazy loaded)
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/posts')({
  component: PostsComponent,
  pendingComponent: PostsPending,
  errorComponent: PostsError,
})
```

`createLazyFileRoute` only supports: `component`, `errorComponent`, `pendingComponent`, `notFoundComponent`.

### Directory Encapsulation

Encapsulate a route's files by moving them into a directory with a `.route` file:

- Before: `posts.tsx`
- After: `posts/route.tsx`

This keeps critical and lazy files co-located.

---

## Code-Based Splitting with `createLazyRoute` and `.lazy()`

Use `Route.lazy()` and `createLazyRoute()`:

```tsx
// src/posts.lazy.tsx
export const Route = createLazyRoute('/posts')({
  component: MyComponent,
})

// src/app.tsx
const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts',
}).lazy(() => import('./posts.lazy').then((d) => d.Route))
```

### `lazyFn()` for Data Loader Splitting

```tsx
import { lazyFn } from '@tanstack/react-router'

const route = createRoute({
  path: '/my-route',
  component: MyComponent,
  loader: lazyFn(() => import('./loader'), 'loader'),
})

// In ./loader.ts
export const loader = async (context: LoaderContext) => { /* ... */ }
```

### `lazyRouteComponent` Helper

```tsx
import { lazyRouteComponent } from '@tanstack/react-router'

const route = createRoute({
  getParentRoute: () => rootRoute,
  path: 'posts',
  component: lazyRouteComponent(() => import('./PostsPage')),
  // Named export:
  component: lazyRouteComponent(() => import('./PostsPage'), 'PostsPage'),
})
```

---

## `getRouteApi()` in Code-Split Components

Access type-safe route APIs from a code-split component file without importing the route:

```tsx
// MyComponent.tsx
import { getRouteApi } from '@tanstack/react-router'

const route = getRouteApi('/my-route')

export function MyComponent() {
  const loaderData = route.useLoaderData()
  //    ^? typed based on the route's loader
  return <div>...</div>
}
```

Supports: `useLoaderData`, `useLoaderDeps`, `useMatch`, `useParams`, `useRouteContext`, `useSearch`.

---

See also: `config-bundlers.md` (autoCodeSplitting plugin option), `advanced-optimization.md` (render optimizations)
