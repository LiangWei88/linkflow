# API Reference: Hooks

All hooks for TanStack Router. Each hook provides reactive access to router state and navigation capabilities.

---

## useNavigate

Returns a `navigate` function for programmatic navigation.

```tsx
const navigate = useNavigate({ from: '/posts' })
await navigate({ to: '/posts/$postId', params: { postId: '1' } })
await navigate({ to: '.', search: { page: 2 }, replace: true })
```

**Signature:** `useNavigate(opts?: { from?: string }) => (options: NavigateOptions) => Promise<void>`

| Option | Type | Description |
|---|---|---|
| `from` | `string` | Route path for relative navigation resolution. Provides type narrowing for `to`. |

---

## useSearch

Returns validated search params for a route.

```tsx
const search = Route.useSearch()
const page = Route.useSearch({ select: (s) => s.page })
const search = useSearch({ from: '/posts' })
const loose = useSearch({ strict: false })
const search = useSearch({ from: '/posts', shouldThrow: false })
```

**Signature:** `useSearch(opts: { from, strict?, select?, structuralSharing?, shouldThrow? })`

| Option | Type | Description |
|---|---|---|
| `from` | `string` | Required (when `strict: true`). Route ID to match search params from |
| `strict` | `boolean` | If `false`, `from` is ignored, types loosened to `Partial<FullSearchSchema>`. Default: `true` |
| `select` | `(search: TSearch) => TSelected` | Transform or narrow the returned search params |
| `structuralSharing` | `boolean` | Enable structural sharing for stable references. Default: `router.defaultStructuralSharing` |
| `shouldThrow` | `boolean` | If `false`, returns `undefined` when route not matched. Default: `true` |

---

## useParams

Returns parsed path parameters for a route.

```tsx
const { postId } = Route.useParams()
const postId = Route.useParams({ select: (p) => p.postId })
const loose = useParams({ strict: false })
```

**Signature:** `useParams(opts?: { from?, strict?, select?, structuralSharing?, shouldThrow? })`

| Option | Type | Description |
|---|---|---|
| `from` | `string` | Route ID to match params from |
| `strict` | `boolean` | If `false`, types loosened to `Partial<AllParams>`. Default: `true` |
| `select` | `(params: TParams) => TSelected` | Transform or narrow the returned params |
| `structuralSharing` | `boolean` | Enable structural sharing for stable references |
| `shouldThrow` | `boolean` | If `false`, returns `undefined` when route not matched. Default: `true` |

---

## useMatch

Returns the `RouteMatch` object for a specific route.

```tsx
const match = useMatch({ from: '/posts/$postId' })
const match = useMatch({ from: rootRouteId }) // root route
const match = useMatch({ from: '/posts', shouldThrow: false }) // undefined if not matched
```

| Option | Type | Description |
|---|---|---|
| `from` | `string` | Route ID to match against. Required when `strict: true` |
| `strict` | `boolean` | If `false`, returns loosely-typed match without requiring `from`. Default: `true` |
| `select` | `(match: RouteMatch) => TSelected` | Transform the returned match |
| `structuralSharing` | `boolean` | Enable structural sharing for stable references |
| `shouldThrow` | `boolean` | If `false`, returns `undefined` instead of throwing. Default: `true` |

---

## useMatches

Returns all current route matches. Position-independent (works from any component).

```tsx
const matches = useMatches()
const loaderDataArray = useMatches({
  select: (matches) => matches.map((m) => m.loaderData),
})
```

| Option | Type | Description |
|---|---|---|
| `select` | `(matches: RouteMatch[]) => TSelected` | Transform the returned matches array |
| `structuralSharing` | `boolean` | Enable structural sharing for stable references |

---

## useRouterState

Returns reactive router state. Preferred over `router.state` which is **not** reactive.

```tsx
const location = useRouterState({ select: (s) => s.location })
const isLoading = useRouterState({ select: (s) => s.isLoading })
```

| Option | Type | Description |
|---|---|---|
| `select` | `(state: RouterState) => TSelected` | **Strongly recommended.** Narrow the state slice to minimize re-renders |
| `structuralSharing` | `boolean` | Enable structural sharing for stable references |

---

## useLocation

Returns the current `ParsedLocation` object.

```tsx
const location = useLocation()
const pathname = useLocation({ select: (l) => l.pathname })
```

| Option | Type | Description |
|---|---|---|
| `select` | `(location: ParsedLocation) => TSelected` | Narrow the returned location data |

---

## useRouter

Returns the `Router` instance from context.

```tsx
const router = useRouter()
await router.invalidate()
```

**Warning:** `router.state` is **not** reactive. Use `useRouterState()` to subscribe to state changes.

---

## useLoaderData

Returns loader data from the route match.

```tsx
const data = Route.useLoaderData()
const posts = Route.useLoaderData({ select: (d) => d.posts })
const data = useLoaderData({ from: '/posts/$postId' })
const loose = useLoaderData({ strict: false })
```

| Option | Type | Description |
|---|---|---|
| `from` | `string` | Route ID. Required when `strict: true` |
| `strict` | `boolean` | If `false`, types loosened to shared loader data types. Default: `true` |
| `select` | `(data: TLoaderData) => TSelected` | Transform or narrow the returned data |
| `structuralSharing` | `boolean` | Enable structural sharing for stable references |

---

## useLoaderDeps

Returns loader dependencies declared via the `loaderDeps` route option.

```tsx
const { page } = Route.useLoaderDeps()
const deps = useLoaderDeps({ from: '/posts/$postId' })
const view = useLoaderDeps({ from: '/posts', select: (d) => d.view })
```

| Option | Type | Description |
|---|---|---|
| `from` | `string` | Required. Route ID to get loader deps from |
| `select` | `(deps: TLoaderDeps) => TSelected` | Transform or narrow the returned deps |
| `structuralSharing` | `boolean` | Enable structural sharing for stable references |

---

## useRouteContext

Returns the context object for the current route.

```tsx
const context = Route.useRouteContext()
const auth = Route.useRouteContext({ select: (ctx) => ctx.auth })
const context = useRouteContext({ from: '/posts/$postId' })
```

| Option | Type | Description |
|---|---|---|
| `from` | `string` | Required. Route ID to match context from |
| `select` | `(context: RouteContext) => TSelected` | Transform or narrow the returned context |

---

## useMatchRoute

Returns a `matchRoute` function for programmatic route pattern matching.

```tsx
const matchRoute = useMatchRoute()
const params = matchRoute({ to: '/posts/$postId' })       // params | false
const pending = matchRoute({ to: '/posts/$postId', pending: true })
const fuzzy = matchRoute({ to: '/posts', fuzzy: true })   // {} (partial match)
```

**Signature:** `useMatchRoute() => (opts: UseMatchRouteOptions) => params | false`

| Option | Type | Description |
|---|---|---|
| `to` | `string` | Route path to match |
| `params` | `object` | Params to match against |
| `fuzzy` | `boolean` | Allow partial matching |
| `pending` | `boolean` | Match against pending location |
| `includeSearch` | `boolean` | Include search params in match (deep inclusive check) |

---

## useChildMatches

Returns child `RouteMatch` objects relative to the current route. Does **not** include the current match.

```tsx
const childMatches = useChildMatches()
```

| Option | Type | Description |
|---|---|---|
| `select` | `(matches: RouteMatch[]) => TSelected` | Transform the returned matches |
| `structuralSharing` | `boolean` | Enable structural sharing for stable references |

---

## useParentMatches

Returns parent `RouteMatch` objects from root down to immediate parent. Does **not** include the current match.

```tsx
const parentMatches = useParentMatches()
```

| Option | Type | Description |
|---|---|---|
| `select` | `(matches: RouteMatch[]) => TSelected` | Transform the returned matches |
| `structuralSharing` | `boolean` | Enable structural sharing for stable references |

---

## useLinkProps

Returns anchor HTML attributes for navigation. Useful for custom link components.

```tsx
const linkProps = useLinkProps({
  to: '/posts/$postId',
  params: { postId: '1' },
})
return <a {...linkProps}>View Post</a>
```

**Signature:** `useLinkProps(opts: ActiveLinkOptions & AnchorHTMLAttributes) => AnchorHTMLAttributes`

---

## useBlocker

Blocks navigation when a condition is met. Commonly used for unsaved form changes.

```tsx
const { proceed, reset, status } = useBlocker({
  shouldBlockFn: ({ current, next, action }) => isDirty,
  enableBeforeUnload: true,
  withResolver: true,
})
// status: 'blocked' | 'idle' | 'proceeding'
```

| Option | Type | Description |
|---|---|---|
| `shouldBlockFn` | `(args: ShouldBlockFnArgs) => boolean \| Promise<boolean>` | Return `true` to block navigation |
| `disabled` | `boolean` | Disable the blocker entirely. Default: `false` |
| `enableBeforeUnload` | `boolean \| (() => boolean)` | Also block browser beforeunload events. Default: `true` |
| `withResolver` | `boolean` | Enable `proceed`/`reset` in return value. Default: `false` |

**ShouldBlockFnArgs:**

```tsx
interface ShouldBlockFnArgs {
  current: { routeId, fullPath, pathname, params, search }
  next: { routeId, fullPath, pathname, params, search }
  action: HistoryAction
}
```

**Return value (when `withResolver: true`):**

| Property | Type | Description |
|---|---|---|
| `status` | `'blocked' \| 'idle'` | Current blocker status |
| `next` | `ShouldBlockFnLocation` | Info about the blocked destination |
| `current` | `ShouldBlockFnLocation` | Info about the current location |
| `action` | `HistoryAction` | The action that triggered the block |
| `proceed` | `() => void` | Allow the blocked navigation |
| `reset` | `() => void` | Cancel and stay on current page |

Returns `void` when `withResolver` is `false`.

---

## useCanGoBack

Returns `true` if the router history has entries to go back to. Experimental.

```tsx
const canGoBack = useCanGoBack()
```

**Limitation:** Router history index resets after `reloadDocument: true` navigation.

---

## useAwaited

Suspends the component until a deferred promise resolves. Used with React Suspense. Only necessary for React 18 (React 19 can use `use()` instead).

```tsx
const data = useAwaited({ promise: deferredPromise })
```

| Option | Type | Description |
|---|---|---|
| `promise` | `Promise<T>` | The deferred promise to await |

**Returns:** Resolved value. Throws error if rejected. Suspends if pending.

---

## useElementScrollRestoration

Manually control scroll restoration for virtualized lists or custom scrollable containers.

```tsx
const scrollEntry = useElementScrollRestoration({ id: 'myList' })
```

**Signature:** `useElementScrollRestoration(opts: { id?: string, getElement?: () => HTMLElement | Window }) => ScrollEntry | undefined`

| Option | Type | Description |
|---|---|---|
| `id` | `string` | Unique ID matching `data-scroll-restoration-id` on the element |
| `getElement` | `() => HTMLElement \| Window` | Return the scrollable element (for window scrolling) |

Returns `{ scrollX: number, scrollY: number }` or `undefined`.

---

See also: `api-components.md` (Link, Outlet, Block components), `api-functions.md` (createRouter, redirect, notFound), `advanced-optimization.md` (render optimizations with select)
