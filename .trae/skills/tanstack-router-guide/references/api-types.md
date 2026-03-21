# API Reference: Types & Utilities

Core types for navigation, state, and matching. Type utilities for building generic components. Deprecation guide.

---

## Key Types

### NavigateOptions

Options accepted by `navigate()`, `<Navigate>`, and `router.navigate()`.

```tsx
type NavigateOptions = ToOptions & {
  replace?: boolean                     // Replace instead of push. Default: false
  resetScroll?: boolean                 // Reset scroll position. Default: true
  hashScrollIntoView?: boolean | ScrollIntoViewOptions  // Scroll to hash. Default: true
  viewTransition?: boolean | ViewTransitionOptions      // Use View Transitions API
  ignoreBlocker?: boolean               // Ignore navigation blockers. Default: false
  reloadDocument?: boolean              // Force full page reload. Default: false
  href?: string                         // External URL (use instead of `to`)
}
```

---

### ToOptions

Core destination options used by navigation, links, and route masks.

```tsx
type ToOptions = {
  from?: ValidRoutePath | string        // Source route for relative resolution
  to?: ValidRoutePath | string          // Target route path
  search?: true | TSearch | ((prev: TFromSearch) => TToSearch)   // Search params
  params?: true | TParams | ((prev: TFromParams) => TToParams)  // Path params
  hash?: true | string | ((prev?: string) => string)             // URL hash
  state?: true | HistoryState | ((prev: HistoryState) => HistoryState) // History state
}
```

- `true` keeps the current value
- Functions receive previous value and return new value

---

### ToMaskOptions

Extends `ToOptions` with route masking support.

```tsx
type ToMaskOptions = ToOptions & {
  unmaskOnReload?: boolean              // Remove mask on page reload
}
```

---

### LinkOptions

Extends `NavigateOptions` with anchor-specific options.

```tsx
type LinkOptions = NavigateOptions & {
  target?: HTMLAnchorElement['target']  // Anchor target attribute
  activeOptions?: ActiveOptions         // Fine-tune active detection
  preload?: false | 'intent' | 'viewport' | 'render'  // Preload strategy
  preloadDelay?: number                 // Delay before preloading (ms)
  disabled?: boolean                    // Disable the link
}
```

---

### ActiveLinkOptions

Extends `LinkOptions` with active/inactive styling props.

```tsx
type ActiveLinkOptions = LinkOptions & {
  activeProps?: AnchorHTMLAttributes | (() => AnchorHTMLAttributes)
  inactiveProps?: AnchorHTMLAttributes | (() => AnchorHTMLAttributes)
}
```

---

### LinkProps

Full props type for the `Link` component.

```tsx
type LinkProps = ActiveLinkOptions &
  Omit<AnchorHTMLAttributes, 'children'> & {
    children?: ReactNode | ((state: { isActive: boolean }) => ReactNode)
  }
```

---

> **Note:** For complete `RouterOptions` and `RouteOptions` interfaces with detailed tables, see `config-router-options.md` and `config-route-options.md`.

---

### RouterState

The reactive state of the router. Access via `useRouterState()`.

```tsx
interface RouterState {
  status: 'idle' | 'pending'            // Overall router status
  isLoading: boolean                    // Any route is loading
  isTransitioning: boolean              // Navigation in progress
  matches: RouteMatch[]                 // Current route matches
  pendingMatches: RouteMatch[]          // Matches for pending navigation
  cachedMatches: RouteMatch[]           // Matches kept in cache
  location: ParsedLocation              // Current (possibly pending) location
  resolvedLocation: ParsedLocation      // Last fully resolved location
  redirect?: Redirect                   // Active redirect if any
}
```

---

### RouteMatch

Represents a matched route in the current route hierarchy.

```tsx
interface RouteMatch {
  id: string                            // Unique match ID
  routeId: string                       // Route ID this match belongs to
  pathname: string                      // Matched pathname segment
  params: TParams                       // Parsed path parameters
  status: 'pending' | 'success' | 'error' | 'redirected' | 'notFound'
  isFetching: false | 'beforeLoad' | 'loader'  // Fetch phase indicator
  showPending: boolean                  // Whether pending component should render
  error: unknown                        // Error if status is 'error'
  paramsError: unknown                  // Error parsing params
  searchError: unknown                  // Error parsing search
  loaderData: TLoaderData               // Data returned by loader
  context: TContext                     // Accumulated route context
  search: TSearch                       // Validated search params
  cause: 'enter' | 'stay'              // Why this match exists
  updatedAt: number                     // Timestamp of last data update
  fetchedAt: number                     // Timestamp of last fetch
  abortController: AbortController      // Abort controller for the match
  ssr?: boolean | 'data-only'          // Whether match was SSR-rendered
  staticData: Record<string, unknown>   // Static data attached to the route
}
```

---

### ParsedLocation

Parsed representation of the current URL.

```tsx
interface ParsedLocation {
  href: string                          // Full URL path + search + hash
  pathname: string                      // URL pathname
  search: TSearch                       // Parsed search params object
  searchStr: string                     // Raw search string
  state: ParsedHistoryState             // History state (includes __TSR_index, __TSR_key)
  hash: string                          // URL hash (without #)
  maskedLocation?: ParsedLocation       // Original location if masked
  unmaskOnReload?: boolean              // Whether to unmask on page reload
}
```

---

### Redirect

Redirect type used by `redirect()`.

```tsx
type Redirect = NavigateOptions & {
  statusCode?: number                   // HTTP status code (301, 302, etc.)
  throw?: any                           // If truthy, throws instead of returning
  headers?: HeadersInit                 // HTTP headers (SSR)
}
```

Use `to` for internal routes, `href` for external URLs.

---

### NotFoundError

Not-found error type used by `notFound()`.

```tsx
interface NotFoundError {
  data?: any                            // Custom data for notFoundComponent
  throw?: boolean                       // Throw instead of returning
  routeId?: string                      // Target route for handling
  headers?: HeadersInit                 // HTTP headers (SSR)
  global?: boolean                      // DEPRECATED: use routeId: rootRouteId
}
```

---

### RouteMask

Route mask configuration type.

```tsx
type RouteMask = ToOptions & {
  routeTree: TRouteTree                 // Required. Route tree this mask supports
  unmaskOnReload?: boolean              // Remove mask on page reload
}
```

---

### ViewTransitionOptions

Options for the View Transitions API.

```tsx
interface ViewTransitionOptions {
  types: string[] | ((info: {
    fromLocation?: ParsedLocation
    toLocation: ParsedLocation
    pathChanged: boolean
    hrefChanged: boolean
    hashChanged: boolean
  }) => string[] | false)
}
```

---

### MatchRouteOptions

Options for route matching functions.

```tsx
interface MatchRouteOptions {
  pending?: boolean                     // Match against pending location
  includeSearch?: boolean               // Include search params in match (deep inclusive)
  fuzzy?: boolean                       // Allow partial matching
  caseSensitive?: boolean               // DEPRECATED: use route/router-level setting
}
```

---

### UseMatchRouteOptions

```tsx
type UseMatchRouteOptions = ToOptions & MatchRouteOptions
```

---

### AsyncRouteComponent

Component type with optional preload support for code splitting.

```tsx
type AsyncRouteComponent<TProps> = SyncRouteComponent<TProps> & {
  preload?: () => Promise<void>
}
```

---

### HistoryState (Interface)

Extendable interface for history state. Extend via module declaration.

```tsx
declare module '@tanstack/react-router' {
  interface HistoryState {
    myCustomProp?: string
  }
}
```

---

### ParsedHistoryState

Extends `HistoryState` with router internals.

```tsx
type ParsedHistoryState = HistoryState & {
  __TSR_key?: string
  __TSR_index: number
}
```

---

### Register (Module Declaration)

Register your router for global type safety. **Required** for type inference across the app.

```tsx
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

---

### StaticDataRouteOption (Module Declaration)

Extend to add custom static data types to routes.

```tsx
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    customData?: string
    requiredRole?: string
  }
}

// Then use in routes:
export const Route = createFileRoute('/admin')({
  staticData: { requiredRole: 'admin' },
})
```

---

## Type Utilities (for Generic Components)

### ValidateLinkOptions

Type-safe link options in reusable/generic components:

```tsx
import type { ValidateLinkOptions, RegisteredRouter } from '@tanstack/react-router'

interface NavItemProps<TOptions = unknown> {
  linkOptions: ValidateLinkOptions<RegisteredRouter, TOptions>
  label: string
}

function NavItem<TOptions>({ linkOptions, label }: NavItemProps<TOptions>) {
  return <Link {...linkOptions}>{label}</Link>
}
```

### ValidateLinkOptionsArray

Type-safe arrays of link options (for menus, navigation bars):

```tsx
import type { ValidateLinkOptionsArray, RegisteredRouter } from '@tanstack/react-router'

interface MenuProps<TItems extends ReadonlyArray<unknown> = ReadonlyArray<unknown>> {
  items: ValidateLinkOptionsArray<RegisteredRouter, TItems>
}
```

### ValidateRedirectOptions

For type-safe redirect helper functions:

```tsx
import type { ValidateRedirectOptions, RegisteredRouter } from '@tanstack/react-router'

function createAuthRedirect<TOptions>(opts: ValidateRedirectOptions<RegisteredRouter, TOptions>) {
  return redirect(opts)
}
```

### ValidateNavigateOptions

For type-safe navigate helper functions:

```tsx
import type { ValidateNavigateOptions, RegisteredRouter } from '@tanstack/react-router'

function safeNavigate<TOptions>(opts: ValidateNavigateOptions<RegisteredRouter, TOptions>) {
  return router.navigate(opts)
}
```

### ValidateFromPath

For type-safe validation of `from` paths:

```tsx
import type { ValidateFromPath, RegisteredRouter } from '@tanstack/react-router'

function useTypeSafeRoute<TFrom extends ValidateFromPath<RegisteredRouter>>(from: TFrom) {
  return useMatch({ from })
}
```

---

## Deprecated (Do Not Use)

| Deprecated | Replacement |
|---|---|
| `FileRoute` class | `createFileRoute()` function |
| `Route` class | `createRoute()` function |
| `RootRoute` class | `createRootRoute()` function |
| `RouteApi` class | `getRouteApi()` function |
| `Router` class | `createRouter()` function |
| `NotFoundRoute` class | `notFoundComponent` route option |
| `rootRouteWithContext()` | `createRootRouteWithContext()` |
| `defer()` | Promises are handled automatically now |
| `parseParams` route option | `params.parse` |
| `stringifyParams` route option | `params.stringify` |
| `preSearchFilters` route option | `search.middlewares` |
| `postSearchFilters` route option | `search.middlewares` |
| `blockerFn` in useBlocker | `shouldBlockFn` |
| `condition` in useBlocker | `shouldBlockFn` with return value |
| `caseSensitive` in MatchRouteOptions | Use route/router-level `caseSensitive` setting |
| `notFoundRoute` router option | `notFoundComponent` on routes |
| `NotFoundError.global` | `notFound({ routeId: rootRouteId })` |

---

See also: `api-functions.md` (redirect, notFound, linkOptions), `api-hooks.md` (hook signatures), `advanced-optimization.md` (type utilities, TS performance)
