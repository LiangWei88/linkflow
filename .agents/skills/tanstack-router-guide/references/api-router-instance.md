# API Reference: Router Instance & Events

Methods and properties on the router object, subscription events, and route instance API.

---

## Router Instance

Methods and properties available on the `router` object returned by `createRouter()`.

### router.state

- Type: `RouterState`
- The current state of the router.
- **Not reactive.** Use `useRouterState()` for reactive state in components.

---

### router.navigate(options)

Navigate programmatically. Same options as `NavigateOptions`.

```tsx
router.navigate({ to: '/posts/$postId', params: { postId: '1' } })
```

---

### router.invalidate(options?)

Invalidates route matches, forcing `beforeLoad` and `loader` to re-run.

```tsx
await router.invalidate()                              // Invalidate all
await router.invalidate({ sync: true })                // Wait for loaders
await router.invalidate({
  filter: (match) => match.routeId === '/posts',       // Specific routes only
  forcePending: true,                                  // Force pending state
})
```

| Option | Type | Description |
|---|---|---|
| `filter` | `(match: RouteMatch) => boolean` | Return `true` to invalidate match |
| `sync` | `boolean` | Wait for loaders before resolving |
| `forcePending` | `boolean` | Force pending state even on errored matches |

---

### router.subscribe(eventType, callback)

Subscribe to router events. Returns an unsubscribe function.

```tsx
const unsub = router.subscribe('onResolved', (evt) => {
  console.log('Navigation:', evt.fromLocation?.pathname, '->', evt.toLocation.pathname)
})
```

See **Router Events** below for all event types.

---

### router.preloadRoute(options?)

Preloads all matches for the given navigation options. Returns matched routes. Defaults to current location if no options provided.

```tsx
const matches = await router.preloadRoute({
  to: '/posts/$postId',
  params: { postId: '1' },
})
```

Preloaded matches are not stored long-term -- only until the next navigation.

---

### router.loadRouteChunk(route)

Loads only the JS chunk for a route (no data loading).

```tsx
await router.loadRouteChunk(router.routesByPath['/posts'])
```

---

### router.load(options?)

Loads all currently matched route matches and resolves when ready to render. Respects `staleTime` -- use `invalidate()` to force reload.

```tsx
await router.load()
await router.load({ sync: true }) // Wait for all loaders
```

Primary use case: SSR to ensure critical data is loaded before rendering.

---

### router.clearCache(options?)

Removes cached route matches.

```tsx
router.clearCache()
router.clearCache({ filter: (match) => match.routeId === '/posts' })
```

---

### router.matchRoutes(pathname, locationSearch?, opts?)

Matches a pathname and search against the route tree. Returns array of route matches.

```tsx
const matches = router.matchRoutes('/posts/123', { tab: 'comments' })
```

| Option | Type | Description |
|---|---|---|
| `pathname` | `string` | Pathname to match |
| `locationSearch` | `Record<string, any>` | Search params to match |
| `opts.throwOnError` | `boolean` | Throw errors during matching |

---

### router.matchRoute(dest, matchOpts?)

Matches a destination against the route tree. Returns matched params or `false`.

```tsx
const params = router.matchRoute({ to: '/posts/$postId', params: { postId: '1' } })
```

---

### router.buildLocation(opts)

Builds a new `ParsedLocation` object for later navigation.

```tsx
const location = router.buildLocation({
  to: '/posts/$postId',
  params: { postId: '1' },
  search: { tab: 'comments' },
})
```

| Option | Type | Description |
|---|---|---|
| `from` | `string` | Source path (default: current path) |
| `to` | `string \| number \| null` | Destination path |
| `params` | `true \| Updater<unknown>` | `true` keeps current params, or provide updater |
| `search` | `true \| Updater<unknown>` | `true` keeps current search, or provide updater |
| `hash` | `true \| Updater<string>` | `true` keeps current hash, or provide updater |
| `state` | `true \| Updater<HistoryState>` | `true` keeps current state, or provide updater |
| `mask` | `BuildNextOptions & { unmaskOnReload? }` | Route masking options |

---

### router.commitLocation(location)

Commits a new location to the browser history.

```tsx
await router.commitLocation({
  ...parsedLocation,
  replace: true,
  resetScroll: false,
})
```

| Option | Type | Description |
|---|---|---|
| `location` | `ParsedLocation` | **Required.** Location to commit |
| `replace` | `boolean` | Use `history.replace` instead of `push`. Default: `false` |
| `resetScroll` | `boolean` | Reset scroll position. Default: `true` |
| `hashScrollIntoView` | `boolean \| ScrollIntoViewOptions` | Scroll hash element into view. Default: `true` |
| `ignoreBlocker` | `boolean` | Ignore navigation blockers. Default: `false` |

---

### router.cancelMatch(matchId)

Cancels a pending route match by calling `match.abortController.abort()`.

```tsx
router.cancelMatch(matchId)
```

---

### router.cancelMatches()

Cancels all pending route matches.

```tsx
router.cancelMatches()
```

---

### router.update(newOptions)

Updates the router instance with new options.

```tsx
router.update({ defaultPreload: 'viewport' })
```

---

### router.dehydrate()

Dehydrates the router's critical state into a serializable object for SSR.

```tsx
const dehydrated = router.dehydrate() // Send to client
```

---

### router.hydrate(dehydrated)

Hydrates the router from a dehydrated state object received from the server.

```tsx
router.hydrate(dehydratedState)
```

---

## Router Events

All events include `{ type, fromLocation?, toLocation, pathChanged, hrefChanged }` (except where noted).

| Event | When Fired | Extra Properties |
|---|---|---|
| `onBeforeNavigate` | Before any navigation begins | Standard payload |
| `onBeforeLoad` | Before loaders execute | Standard payload |
| `onLoad` | After loaders complete | Standard payload |
| `onBeforeRouteMount` | Before route components mount | Standard payload |
| `onResolved` | Location fully resolved (best for analytics) | Standard payload |
| `onRendered` | After route components render | `fromLocation?`, `toLocation` only |
| `onInjectedHtml` | When HTML is injected (SSR only) | `type` only |

```tsx
const unsub = router.subscribe('onResolved', (evt) => {
  analytics.track('pageview', { path: evt.toLocation.pathname })
})
```

---

## Route Type (Instance)

Properties and methods on route instances returned by `createRoute`/`createFileRoute`.

| Method | Type | Description |
|---|---|---|
| `.addChildren(children)` | `(routes: Route[]) => this` | Add child routes to the route tree |
| `.update(options)` | `(opts: Partial<RouteOptions>) => this` | Update route with new options |
| `.lazy(importer)` | `(fn: () => Promise<...>) => this` | Attach a lazy importer for code splitting |
| `.redirect(opts?)` | `(opts?: RedirectOptions) => Redirect` | Type-safe redirect pre-bound to route's `from` |
| `...RouteApi methods` | | All `useMatch`, `useParams`, etc. available |

---

See also: `api-functions.md` (createRouter), `api-types.md` (RouterState, RouteMatch), `config-router-options.md` (all router options)
