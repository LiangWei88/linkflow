# API Reference: Functions

Functions for creating routes, routers, links, redirects, and search middleware.

---

### createRouter(options)

Creates a `Router` instance. Entry point for all routing.

```tsx
const router = createRouter({
  routeTree,
  context: { auth: undefined! },
  defaultPreload: 'intent',
  defaultPendingMs: 1000,
})
```

- Options: `RouterOptions` (see type below)
- **Required:** `routeTree`
- Returns: `Router` instance

---

### createRootRoute(options?)

Creates the root route. Does not accept `path`, `id`, `getParentRoute`, `caseSensitive`, or `parseParams`/`stringifyParams`.

```tsx
const rootRoute = createRootRoute({
  component: RootLayout,
  errorComponent: GlobalError,
  notFoundComponent: NotFound,
  beforeLoad: async ({ context }) => { /* runs before every route */ },
})
```

---

### createRootRouteWithContext\<TContext\>()(options?)

Creates a root route that requires typed context from `createRouter`. Note the **double function call** `()()`.

```tsx
interface RouterContext { auth: AuthState; queryClient: QueryClient }

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

const router = createRouter({
  routeTree,
  context: { auth, queryClient }, // TypeScript enforces shape
})
```

---

### createRoute(options)

Creates a route for code-based routing.

```tsx
const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts',
  component: PostsPage,
  loader: () => fetchPosts(),
})

// Layout route (no path, wraps children)
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_layout',
  component: LayoutComponent,
})
```

**Required:** `getParentRoute`, and one of `path` or `id`.

---

### createFileRoute(path)(options)

Creates a file-based route. The `path` argument is auto-managed by the TanStack Router plugin.

```tsx
// src/routes/posts.$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  component: PostPage,
  loader: ({ params }) => fetchPost(params.postId),
  validateSearch: (search) => ({ tab: search.tab ?? 'details' }),
})
```

Must be exported as `Route`.

---

### createLazyFileRoute(path)(options)

Creates a lazy-loaded file route. Only accepts non-critical route options.

```tsx
// src/routes/posts.$postId.lazy.tsx
export const Route = createLazyFileRoute('/posts/$postId')({
  component: PostPage,
  pendingComponent: PostLoading,
  errorComponent: PostError,
  notFoundComponent: PostNotFound,
})
```

**Allowed options:** `component`, `pendingComponent`, `errorComponent`, `notFoundComponent` only.

---

### createLazyRoute(id)(options)

Creates a lazy route for manual code-based routing. Same allowed options as `createLazyFileRoute`.

```tsx
const postLazy = createLazyRoute('/posts/$postId')({
  component: PostPage,
})

// Attach to route:
const postRoute = createRoute({ ... }).lazy(() => import('./post.lazy').then(d => d.postLazy))
```

---

### createLink(component)

Creates a custom `Link` component wrapping a provided anchor-like component. Preserves full TanStack Router type safety.

```tsx
import { createLink, LinkComponent } from '@tanstack/react-router'

const BasicLinkComponent = React.forwardRef<HTMLAnchorElement, BasicLinkProps>(
  (props, ref) => <a ref={ref} {...props} className="text-blue-700" />,
)

const CreatedLinkComponent = createLink(BasicLinkComponent)

export const CustomLink: LinkComponent<typeof BasicLinkComponent> = (props) => {
  return <CreatedLinkComponent preload="intent" {...props} />
}
```

Works with third-party UI libraries (React Aria Components, Material UI, Chakra UI, shadcn/ui).

---

### createRouteMask(options)

Creates a route mask to display a different URL than the actual route.

```tsx
const routeMasks = [
  createRouteMask({
    routeTree,
    from: '/photos/$photoId/modal',
    to: '/photos/$photoId',
    params: true,
    unmaskOnReload: true,
  }),
]
const router = createRouter({ routeTree, routeMasks })
```

---

### redirect(options)

Creates and throws a redirect. Use in `beforeLoad`, `loader`, or components.

```tsx
throw redirect({ to: '/login', search: { redirect: location.href }, statusCode: 301 })
throw redirect({ href: 'https://example.com' }) // External redirect
redirect({ to: '/login', throw: true })           // Self-throwing variant
```

| Option | Type | Description |
|---|---|---|
| `to` | `string` | Target route path (internal). Mutually exclusive with `href` |
| `href` | `string` | External URL (bypasses router). Mutually exclusive with `to` |
| `search` | `object` | Search params |
| `params` | `object` | Path params |
| `hash` | `string` | URL hash |
| `state` | `object` | History state |
| `statusCode` | `number` | HTTP status (301, 302, etc.) |
| `headers` | `HeadersInit` | Response headers (SSR) |
| `replace` | `boolean` | Replace history entry |
| `throw` | `boolean` | If `true`, throws the redirect instead of returning it |

**Route-bound variant:** `Route.redirect(opts)` and `getRouteApi(routeId).redirect(opts)` automatically set `from` for type-safe relative redirects.

---

### notFound(options?)

Creates and throws a not-found error. Use in `beforeLoad` or `loader`.

```tsx
throw notFound()
throw notFound({ data: { message: 'Post not found' } })
throw notFound({ routeId: rootRouteId })  // Handled by root notFoundComponent
```

| Option | Type | Description |
|---|---|---|
| `data` | `any` | Custom data accessible in notFoundComponent |
| `routeId` | `string` | Target route for the not-found boundary |
| `throw` | `boolean` | If `true`, throws instead of returning |
| `headers` | `HeadersInit` | HTTP headers (SSR) |

---

### isRedirect(value)

Type guard that returns `true` if the value is a redirect object.

```tsx
if (isRedirect(e)) throw e // re-throw redirects
```

---

### isNotFound(value)

Type guard that returns `true` if the value is a `NotFoundError` object.

```tsx
if (isNotFound(e)) throw e // re-throw not-found errors
```

---

### defer(promise) -- DEPRECATED

Promises returned from loaders are now handled automatically. Remove `defer()` wrappers.

---

### lazyRouteComponent(importer, exportName?)

Creates a lazy-loaded component with a `preload()` method for code splitting.

```tsx
const LazyPost = lazyRouteComponent(() => import('./PostPage'))
const LazyPost = lazyRouteComponent(() => import('./PostPage'), 'PostPage') // named export
```

If using file-based routing, prefer `createLazyFileRoute` instead.

---

### getRouteApi(routeId)

Returns a type-safe `RouteApi` instance bound to a specific route. Alternative to `Route.useX()` methods.

```tsx
const routeApi = getRouteApi('/posts/$postId')

function PostPage() {
  const params = routeApi.useParams()
  const search = routeApi.useSearch()
  const data = routeApi.useLoaderData()
  const deps = routeApi.useLoaderDeps()
  const context = routeApi.useRouteContext()
  const navigate = routeApi.useNavigate()
}
```

**RouteApi methods:** `useMatch`, `useSearch`, `useParams`, `useLoaderData`, `useLoaderDeps`, `useRouteContext`, `useNavigate`, `redirect`. All accept the same options as their hook counterparts but with `from` pre-bound.

---

### linkOptions(options)

Type-checks and returns link navigation options. Useful for building reusable link configurations.

```tsx
const postLink = linkOptions({
  to: '/posts/$postId',
  params: { postId: '1' },
})

<Link {...postLink} />
navigate(postLink)
```

Returns the input object with exact inferred types.

---

### retainSearchParams(keys | true)

Search middleware that preserves specific search params across navigations.

```tsx
export const Route = createFileRoute('/posts')({
  validateSearch: (search) => ({ page: Number(search.page) || 1 }),
  search: {
    middlewares: [retainSearchParams(['page'])],
  },
})

// Pass `true` to retain all search params
retainSearchParams(true)
```

---

### stripSearchParams(keys | defaults | true)

Search middleware that removes search params when they match their default values.

```tsx
export const Route = createFileRoute('/posts')({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [stripSearchParams({ page: 1, sort: 'date' })], // strip defaults
  },
})

// Strip specific keys always:
stripSearchParams(['hello'])

// Strip all (only if schema has no required params):
stripSearchParams(true)
```

---

See also: `api-hooks.md` (all hooks), `api-router-instance.md` (router methods and events), `api-types.md` (NavigateOptions, RouterState)
