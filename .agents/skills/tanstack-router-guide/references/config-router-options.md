# Configuration: Router Options (createRouter)

All options accepted by `createRouter({...})`.

---

## Required

| Option | Type | Description |
|--------|------|-------------|
| `routeTree` | `RootRoute` | The route tree, typically imported from `routeTree.gen.ts` |

```ts
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })
```

---

## Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `basepath` | `string` | `'/'` | Base path prefix for all routes. Use when app is mounted at a subpath (e.g., `'/app'`) |
| `context` | `object` | `{}` | Initial context object passed to all routes via `beforeLoad` and `loader`. Must satisfy the context type defined in `createRootRouteWithContext<T>()` |
| `history` | `RouterHistory` | `createBrowserHistory()` | History instance. Options: `createBrowserHistory()`, `createHashHistory()`, `createMemoryHistory()` |

```ts
import { createRouter, createHashHistory } from '@tanstack/react-router'

const router = createRouter({
  routeTree,
  basepath: '/app',
  context: { auth: authState, queryClient },
  history: createHashHistory(),
})
```

---

## Default Components

Set fallback components used when a route does not define its own.

| Option | Type | Description |
|--------|------|-------------|
| `defaultComponent` | `RouteComponent` | Default component rendered for routes without a `component` |
| `defaultErrorComponent` | `ErrorRouteComponent` | Default error boundary. Receives `{ error, reset }` |
| `defaultNotFoundComponent` | `NotFoundRouteComponent` | Default 404 component. Receives `{ data }` |
| `defaultPendingComponent` | `RouteComponent` | Default loading/pending component shown while loader resolves |

```ts
const router = createRouter({
  routeTree,
  defaultPendingComponent: () => <div>Loading...</div>,
  defaultErrorComponent: ({ error }) => <div>Error: {error.message}</div>,
  defaultNotFoundComponent: () => <div>Page not found</div>,
})
```

---

## Preloading

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultPreload` | `false \| 'intent' \| 'viewport' \| 'render'` | `false` | Default preload strategy. `'intent'` preloads on hover/focus. `'viewport'` preloads when link enters viewport. `'render'` preloads immediately when link renders. |
| `defaultPreloadDelay` | `number` | `50` | Delay in milliseconds before preloading begins (prevents preloading on quick mouse passes) |

```ts
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadDelay: 100,
})
```

---

## Data Loading

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultStaleTime` | `number` | `0` | How long (ms) loader data is considered fresh. While fresh, navigating to the route reuses cached data without re-calling the loader. Set to `Infinity` for load-once behavior. |
| `defaultPreloadStaleTime` | `number` | `30000` (30s) | How long (ms) preloaded data is considered fresh. Set to `0` when using external caching (TanStack Query) so all preload events flow through. |
| `defaultPreloadGcTime` | `number` | `300000` (5 min) | How long (ms) to keep unused preloaded data before garbage collecting. |
| `defaultPendingMs` | `number` | `1000` | Time (ms) to wait before showing the pending component. Prevents flash of loading state for fast loaders. |
| `defaultPendingMinMs` | `number` | `500` | Minimum time (ms) to show the pending component once displayed. Prevents flash of loading then content. |
| `defaultGcTime` | `number` | `1800000` (30 min) | How long (ms) to keep unused loader data in cache before garbage collecting. |

```ts
const router = createRouter({
  routeTree,
  defaultStaleTime: 30_000,
  defaultPendingMs: 200,
  defaultPendingMinMs: 300,
  defaultGcTime: 600_000,
})
```

---

## Search Params

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `parseSearch` | `(searchStr: string) => Record<string, unknown>` | Built-in parser | Custom function to parse the URL search string into an object |
| `stringifySearch` | `(search: Record<string, unknown>) => string` | Built-in serializer | Custom function to serialize a search object into a URL search string |

```ts
import qs from 'qs'

const router = createRouter({
  routeTree,
  parseSearch: (searchStr) => qs.parse(searchStr, { ignoreQueryPrefix: true }),
  stringifySearch: (search) => qs.stringify(search, { addQueryPrefix: true }),
})
```

---

## Error Handling

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `notFoundMode` | `'fuzzy' \| 'root'` | `'fuzzy'` | `'fuzzy'`: show 404 at the nearest ancestor with a `notFoundComponent`. `'root'`: always show at root. |
| `defaultOnCatch` | `(error: Error, errorInfo: ErrorInfo) => void` | `undefined` | Global error handler called when any route error boundary catches an error. Use for error reporting services. |
| `disableGlobalCatchBoundary` | `boolean` | `false` | When `true`, errors bubble to the browser-level error handler instead of being caught by the router. |

---

## URL Behavior

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trailingSlash` | `'never' \| 'always' \| 'preserve'` | `'never'` | `'never'`: strip trailing slashes. `'always'`: enforce trailing slashes. `'preserve'`: keep as-is. |
| `caseSensitive` | `boolean` | `false` | When `true`, route matching is case-sensitive (`/About` !== `/about`) |
| `pathParamsAllowedCharacters` | `string[]` | `[]` | Array of special characters allowed in path parameters. By default only alphanumeric and `-_~` are allowed. |
| `search.strict` | `boolean` | `false` | When `true`, unknown search params are removed. When `false`, unknown search params are preserved. |

```ts
const router = createRouter({
  routeTree,
  trailingSlash: 'always',
  caseSensitive: true,
  pathParamsAllowedCharacters: ['@', '+'],
})
```

---

## Scroll Restoration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scrollRestoration` | `boolean` | `false` | Enable automatic scroll position restoration on navigation |
| `scrollToTopSelectors` | `string[]` | `[]` | CSS selectors of additional scrollable elements to restore (e.g., `['#main-content', '.sidebar']`) |
| `getScrollRestorationKey` | `(location: ParsedLocation) => string` | Uses `location.state.key` | Custom function to generate the cache key for scroll positions |
| `scrollRestorationBehavior` | `'instant' \| 'smooth' \| 'auto'` | `'instant'` | Scroll behavior when restoring position |
| `defaultHashScrollIntoView` | `boolean \| ScrollIntoViewOptions` | `true` | Controls scrolling behavior when navigating to hash links. Set to `false` to disable. |

```ts
const router = createRouter({
  routeTree,
  scrollRestoration: true,
  scrollToTopSelectors: ['#main-content'],
  scrollRestorationBehavior: 'smooth',
  getScrollRestorationKey: (location) => location.pathname,
})
```

---

## Advanced Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `Wrap` | `ComponentType<{ children: ReactNode }>` | `undefined` | Component that wraps the entire `RouterProvider`. Use for providers that need access to the router. |
| `InnerWrap` | `ComponentType<{ children: ReactNode }>` | `undefined` | Component that wraps inside `RouterProvider` but outside route rendering. |
| `routeMasks` | `RouteMask[]` | `[]` | Array of route masks for URL masking. Created with `createRouteMask()`. |
| `rewrite` | `{ input: string, output: string }` | `undefined` | URL rewrite configuration. Rewrites the URL before route matching without changing the browser URL. |
| `defaultStructuralSharing` | `boolean` | `true` | Enable structural sharing for search params. When `true`, search param objects maintain referential equality if values haven't changed. |
| `viewTransition` | `boolean \| ViewTransitionOptions` | `false` | Enable the View Transitions API for route transitions. |
| `defaultRemountDeps` | `(opts: { routeId: string }) => any` | `undefined` | Default function to compute dependencies that trigger component remounting. |
| `dehydrate` | `() => TDehydrated` | `undefined` | SSR: function to dehydrate router state for transfer to client |
| `hydrate` | `(dehydrated: TDehydrated) => void` | `undefined` | SSR: function to hydrate router state from server |

```ts
import { createRouteMask } from '@tanstack/react-router'

const postMask = createRouteMask({
  routeTree,
  from: '/posts/$postId',
  to: '/posts',
  params: true,
  search: { preview: true },
})

const router = createRouter({
  routeTree,
  routeMasks: [postMask],
  Wrap: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
  viewTransition: true,
})
```

---

See also: `config-route-options.md` (per-route options), `api-functions.md` (createRouter), `advanced-url-features.md` (URL rewrites, route masking)
