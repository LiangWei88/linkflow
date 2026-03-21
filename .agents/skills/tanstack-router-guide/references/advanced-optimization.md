# Advanced: Type Safety & Optimization

Type safety philosophy, TypeScript performance tips, type utilities, render optimizations, and view transitions.

---

## Type Safety

### Philosophy

TanStack Router fully infers types from route definitions and pipes them through the entire routing experience. You write fewer type annotations and get more confidence from TypeScript.

### Route Definitions Typing

**File-based routing:** Type safety is automatic. The generated route tree provides full inference.

**Code-based routing:** Every child route must declare its parent via `getParentRoute`. Without this, search params and context from ancestor routes are lost:

```tsx
const childRoute = createRoute({
  getParentRoute: () => parentRoute,
  path: 'child',
})
```

### Register Interface

Register your router with the module so exported hooks/components (`Link`, `useNavigate`, `useParams`, etc.) have full type inference:

```tsx
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

Without registration, these APIs are untyped.

### The `from` Parameter

Components outside route files need a `from` hint for typed hooks:

```tsx
// In a shared component -- typed via `from`
function PostSidebar() {
  const { postId } = useParams({ from: '/posts/$postId' })
  const { tab } = useSearch({ from: '/posts/$postId' })
}
```

Each route also exposes type-safe hook versions directly:

```tsx
function PostsComponent() {
  const params = Route.useParams()   // Already scoped to this route
  const search = Route.useSearch()
}
```

If `from` is omitted, hooks return a union of all possible route types. If a wrong `from` is passed, a runtime error is thrown.

### Shared Components with `strict: false`

For components rendered across multiple routes where `from` cannot be specified:

```tsx
function GenericBreadcrumb() {
  const search = useSearch({ strict: false })
  // search is typed as a union of all possible search params
}
```

### TypeScript Performance Tips

For large route trees (50+ routes):

**1. Use object syntax for `addChildren`** (better TS performance than arrays):

```tsx
const routeTree = rootRoute.addChildren({
  indexRoute,
  postsRoute: postsRoute.addChildren({ postRoute, postsIndexRoute }),
})
```

**2. Avoid bare internal types without narrowing:**

```tsx
// SLOW -- union of ALL routes
const props: LinkProps = {}

// FAST -- narrowed to specific routes
const props: LinkProps<RegisteredRouter, '/posts', '/posts/$postId'> = {}
```

**3. Use `as const satisfies` instead of type annotations:**

```tsx
// FAST -- precise inferred type
const options = {
  to: '/posts/$postId',
  params: { postId: '1' },
} as const satisfies LinkOptions
```

**4. Only infer what you use.** When using TanStack Query's `ensureQueryData` in a loader, avoid letting TS infer the return type if you never consume `useLoaderData()`:

```tsx
// Infers Promise<void> -- fast
loader: async ({ context: { queryClient }, params: { postId } }) => {
  await queryClient.ensureQueryData(postQueryOptions(postId))
},
```

**5. Narrow `Link` usage with `from` or `to`:**

```tsx
// SLOW -- checks against all routes
<Link to=".." search={{ page: 0 }} />

// FAST -- narrowed
<Link from={Route.fullPath} to=".." search={{ page: 0 }} />
```

---

## Type Utilities

Utility types for building generic, reusable, type-safe components and functions.

### `ValidateLinkOptions<TRouter, TOptions>`

Type-check an object literal as valid `Link` options:

```tsx
export interface HeaderLinkProps<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TOptions = unknown,
> {
  title: string
  linkOptions: ValidateLinkOptions<TRouter, TOptions>
}

export function HeadingLink<TRouter extends RegisteredRouter, TOptions>(
  props: HeaderLinkProps<TRouter, TOptions>,
): React.ReactNode
export function HeadingLink(props: HeaderLinkProps): React.ReactNode {
  return (
    <>
      <h1>{props.title}</h1>
      <Link {...props.linkOptions} />
    </>
  )
}

// Usage -- fully type-safe
<HeadingLink title="Post" linkOptions={{ to: '/posts/$postId', params: { postId: '1' } }} />
```

Use a permissive overload (without type parameters) for the implementation to avoid type assertions.

### `ValidateLinkOptionsArray<TRouter, TItems>`

Type-check an array of `Link` options. Supports an optional `TFrom` parameter for relative navigation:

```tsx
export interface MenuProps<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TItems extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
> {
  items: ValidateLinkOptionsArray<TRouter, TItems>
}

export function Menu<TRouter extends RegisteredRouter, TItems extends ReadonlyArray<unknown>>(
  props: MenuProps<TRouter, TItems>,
): React.ReactNode
export function Menu(props: MenuProps): React.ReactNode {
  return (
    <ul>
      {props.items.map((item) => (
        <li><Link {...item} /></li>
      ))}
    </ul>
  )
}

// With fixed `from` for relative navigation:
export interface RelativeMenuProps<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TItems extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
  TFrom extends string = string,
> {
  from: ValidateFromPath<TRouter, TFrom>
  items: ValidateLinkOptionsArray<TRouter, TItems, TFrom>
}
```

### `ValidateRedirectOptions<TRouter, TOptions>`

Type-check redirect options at inference sites:

```tsx
export async function fetchOrRedirect<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TOptions,
>(
  url: string,
  redirectOptions: ValidateRedirectOptions<TRouter, TOptions>,
): Promise<unknown>
export async function fetchOrRedirect(
  url: string,
  redirectOptions: ValidateRedirectOptions,
): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok && response.status === 401) {
    throw redirect(redirectOptions)
  }
  return await response.json()
}
```

### `ValidateNavigateOptions<TRouter, TOptions>`

Type-check navigate options for custom hooks:

```tsx
export function useConditionalNavigate<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TOptions,
>(navigateOptions: ValidateNavigateOptions<TRouter, TOptions>)
export function useConditionalNavigate(navigateOptions: ValidateNavigateOptions) {
  const [enabled, setEnabled] = useState(false)
  const navigate = useNavigate()
  return {
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    navigate: () => { if (enabled) navigate(navigateOptions) },
  }
}
```

### `ValidateFromPath<TRouter>`

Validate that a `from` path exists in the router's route tree. Use with `ValidateLinkOptionsArray` for relative menus.

### Best Practices for Type Utilities

- Always specify `TRouter` on public-facing signatures for best TS performance.
- Use `TOptions` at inference sites to correctly narrow `params` and `search`.
- Use permissive overloads (without generics) for implementations to avoid type assertions.

---

## Render Optimizations

### Structural Sharing

Search params maintain referential stability when unchanged. Navigating from `?foo=f1&bar=b1` to `?foo=f1&bar=b2` keeps `search.foo` referentially stable:

```tsx
const search = Route.useSearch()
// When only bar changes, search.foo keeps the same reference
```

### Fine-Grained Selectors with `select`

Subscribe to specific parts of state to minimize re-renders:

```tsx
const page = Route.useSearch({ select: (s) => s.page })
// Component only re-renders when page changes
```

### Structural Sharing with `select`

When `select` returns a new object, the component re-renders every time. Enable structural sharing to preserve referential stability:

```tsx
const result = Route.useSearch({
  select: (search) => ({
    foo: search.foo,
    hello: `hello ${search.foo}`,
  }),
  structuralSharing: true, // Preserves reference if values unchanged
})
```

### Enable Globally

```tsx
const router = createRouter({
  routeTree,
  defaultStructuralSharing: true,
})
```

### Type Safety Caveat

Structural sharing only works with JSON-compatible data. TypeScript raises an error if you return non-JSON-compatible values (e.g., `new Date()`) with `structuralSharing: true`. Disable it per-hook if needed:

```tsx
const result = Route.useSearch({
  select: (search) => ({ date: new Date() }),
  structuralSharing: false, // Required for non-JSON data
})
```

---

## View Transitions API

Coordinate CSS view transitions with router navigation. Requires browser support for `document.startViewTransition()`. Falls back gracefully if unsupported.

### Basic Usage

```tsx
<Link to="/about" viewTransition={true}>About</Link>

navigate({ to: '/about', viewTransition: true })
```

### With Transition Types

```tsx
// Static types
<Link to="/about" viewTransition={{ types: ['page-transition'] }}>About</Link>

// Dynamic types based on navigation context
<Link
  to="/about"
  viewTransition={{
    types: (info) => {
      if (info.pathChanged) return ['slide', 'fade']
      return false // Skip transition
    },
  }}
>
  About
</Link>
```

The `info` object provides: `fromLocation?`, `toLocation`, `pathChanged`, `hrefChanged`, `hashChanged`.

---

See also: `api-hooks.md` (select option on hooks), `api-types.md` (type utilities), `advanced-code-splitting.md` (bundle optimization)
