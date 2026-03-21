# Patterns: Data Loading & Errors

Data loading, mutations, caching, preloading, and error handling patterns for TanStack Router. All examples use file-based routing with TypeScript.

---

## Data Loading Patterns

### Route Loaders

Return data from the `loader` function. Consume with `Route.useLoaderData()`.

```tsx
export const Route = createFileRoute('/posts')({
  loader: () => fetchPosts(),
  component: () => {
    const posts = Route.useLoaderData()
    return <PostList posts={posts} />
  },
})
```

### Pending Component for Slow Loaders

After 1 second (default `pendingMs`), show a pending UI. The minimum display time is 500ms (default `pendingMinMs`) to avoid flash.

```tsx
export const Route = createFileRoute('/posts')({
  loader: () => fetchPosts(),
  pendingComponent: () => <Spinner />,
  pendingMs: 1000,
  pendingMinMs: 500,
})
```

### Error Handling

```tsx
export const Route = createFileRoute('/posts')({
  loader: () => fetchPosts(),
  errorComponent: ({ error, reset }) => {
    const router = useRouter()
    return (
      <div>
        {error.message}
        <button onClick={() => router.invalidate()}>Retry</button>
      </div>
    )
  },
})
```

Use `router.invalidate()` (not `reset()`) when the error came from a loader, since it coordinates both reload and error boundary reset.

### SWR Caching

Data is cached by pathname + `loaderDeps`. Key options:
- `staleTime` (default `0`) -- how long data is fresh for navigations
- `preloadStaleTime` (default `30s`) -- how long preloaded data is fresh
- `gcTime` (default `30min`) -- how long unused data stays in cache

```tsx
export const Route = createFileRoute('/posts')({
  loader: () => fetchPosts(),
  staleTime: 10_000, // Fresh for 10 seconds
})
```

### Opt-Out of Caching (Remix-Like Behavior)

```tsx
export const Route = createFileRoute('/posts')({
  loaderDeps: ({ search: { offset, limit } }) => ({ offset, limit }),
  loader: ({ deps }) => fetchPosts(deps),
  gcTime: 0,
  shouldReload: false,
})
```

---

## Data Mutations

### Invalidating After Mutation

Use `router.invalidate()` to force all current route matches to reload their loaders. Existing data is served until new data is ready (background revalidation).

```tsx
const router = useRouter()

const addTodo = async (todo: Todo) => {
  try {
    await api.addTodo()
    router.invalidate()
  } catch {
    // handle error
  }
}
```

### Synchronous Invalidation

Pass `{ sync: true }` to await the invalidation until all loaders finish.

```tsx
await router.invalidate({ sync: true })
```

### Clearing Mutation State on Navigation

Use `router.subscribe('onResolved')` to clean up mutation state when the route changes. The `onResolved` event fires when the location path changes and resolves (not on reloads).

```tsx
const router = createRouter({ routeTree })
const coolMutationCache = createCoolMutationCache()

router.subscribe('onResolved', () => {
  coolMutationCache.clear()
})
```

### Mutation Keys for State Reset

Use mutation keys tied to route params so mutation state resets when params change:

```tsx
function ChatRoom() {
  const { roomId } = routeApi.useParams()

  const sendMessageMutation = useCoolMutation({
    fn: sendMessage,
    key: ['sendMessage', roomId], // Resets when roomId changes
  })
}
```

---

## External Data Loading (TanStack Query Integration)

### Basic Pattern with ensureQueryData

Use `queryClient.ensureQueryData` in loaders to prefetch, then `useSuspenseQuery` in components.

```tsx
const postsQueryOptions = queryOptions({
  queryKey: ['posts'],
  queryFn: () => fetchPosts(),
})

export const Route = createFileRoute('/posts')({
  loader: () => queryClient.ensureQueryData(postsQueryOptions),
  component: () => {
    const { data: { posts } } = useSuspenseQuery(postsQueryOptions)
    return posts.map((post) => <Post key={post.id} post={post} />)
  },
})
```

### Error Handling with useQueryErrorResetBoundary

Reset the query error boundary on mount so the query retries when the component re-renders.

```tsx
export const Route = createFileRoute('/')({
  loader: () => queryClient.ensureQueryData(postsQueryOptions),
  errorComponent: ({ error, reset }) => {
    const router = useRouter()
    const queryErrorResetBoundary = useQueryErrorResetBoundary()

    useEffect(() => {
      queryErrorResetBoundary.reset()
    }, [queryErrorResetBoundary])

    return (
      <div>
        {error.message}
        <button onClick={() => router.invalidate()}>Retry</button>
      </div>
    )
  },
})
```

### Router Config for External Caches

Set `defaultPreloadStaleTime: 0` so every preload/load event triggers your loader, letting the external cache (e.g., React Query) manage freshness.

```tsx
const router = createRouter({
  routeTree,
  defaultPreloadStaleTime: 0,
})
```

### SSR Dehydration/Hydration with TanStack Query

Use the router's `dehydrate`/`hydrate` options and `Wrap` to coordinate with QueryClient.

```tsx
export function createRouter() {
  const queryClient = new QueryClient()

  return createRouter({
    routeTree,
    context: { queryClient },
    dehydrate: () => ({
      queryClientState: dehydrate(queryClient),
    }),
    hydrate: (dehydrated) => {
      hydrate(queryClient, dehydrated.queryClientState)
    },
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
  })
}
```

---

## Preloading

### Three Strategies

- **Intent** -- Preload on hover/touchstart of `<Link>`. Best for likely-next routes.
- **Viewport** -- Preload when `<Link>` enters viewport (IntersectionObserver). Best for below-fold links.
- **Render** -- Preload as soon as `<Link>` renders in DOM. Best for always-needed routes.

### Enable Globally

```tsx
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadDelay: 50, // ms before preload triggers (default: 50)
})
```

### Per-Link Override

```tsx
<Link to="/post/$postId" preload="intent" preloadDelay={100}>Post</Link>
<Link to="/settings" preload="viewport">Settings</Link>
<Link to="/critical" preload="render">Critical Page</Link>
```

### Preload Timing

- `defaultPreloadMaxAge` (default `30s`) -- how long unused preloaded data stays in memory
- `defaultPreloadStaleTime` (default `30s`) -- how long before another preload triggers
- Set `defaultPreloadStaleTime: 0` when using external caches (TanStack Query, SWR)

### Manual Preloading

```tsx
const router = useRouter()

// Preload full route (loaders + components)
await router.preloadRoute({
  to: '/posts/$postId',
  params: { postId: '1' },
})

// Preload only the JS chunk (no data loading)
await router.loadRouteChunk(router.routesByPath['/posts'])
```

---

## Not Found Errors

### notFoundMode: fuzzy vs root

- **fuzzy** (default): Renders `notFoundComponent` on the nearest parent route with children and a configured `notFoundComponent`. Preserves as much layout as possible.
- **root**: All not-found errors render only on the root route.

### Basic notFoundComponent

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params: { postId } }) => {
    const post = await getPost(postId)
    if (!post) throw notFound()
    return { post }
  },
  notFoundComponent: () => <p>Post not found!</p>,
})
```

### Default Router-Wide Not Found

```tsx
const router = createRouter({
  defaultNotFoundComponent: () => (
    <div>
      <p>Not found!</p>
      <Link to="/">Go home</Link>
    </div>
  ),
})
```

### Throwing notFound with Data

Pass incomplete loader data to the `notFoundComponent` via the `data` option. Inside `notFoundComponent`, `useLoaderData` is NOT available, but `useParams`, `useSearch`, and `useRouteContext` work.

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params: { postId } }) => {
    const post = await getPost(postId)
    if (!post) throw notFound({ data: { postId } })
    return { post }
  },
  notFoundComponent: ({ data }) => {
    const { postId } = Route.useParams()
    return <p>Post with id {postId} not found!</p>
  },
})
```

### Targeting a Specific Route

```tsx
throw notFound({ routeId: '/_pathlessLayout' })

// Target root explicitly
import { rootRouteId } from '@tanstack/react-router'
throw notFound({ routeId: rootRouteId })
```

### Throwing Not Found in Components

Use the `CatchNotFound` component to catch not-found errors thrown in components. However, prefer throwing in loaders to avoid flickering and ensure correct loader data typing.

### Throwing in beforeLoad

A `notFound()` thrown in `beforeLoad` always triggers the root route's `notFoundComponent`, since parent layout data may not be loaded yet.

---

## Static Route Data

### Attaching Metadata

Use `staticData` for synchronous, per-route metadata that is available before loading starts.

```tsx
export const Route = createFileRoute('/posts')({
  staticData: { customData: 'Hello!' },
})
```

### Type Enforcement via Declaration Merging

```tsx
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    customData?: string
    showNavbar?: boolean
    getTitle?: () => string
  }
}
```

### Breadcrumbs with staticData

```tsx
export const Route = createFileRoute('/posts/$postId')({
  staticData: {
    getTitle: () => 'Post Details',
  },
})

// In root component
function Breadcrumbs() {
  const matches = useMatches()
  return (
    <nav>
      {matches
        .filter((m) => m.staticData?.getTitle)
        .map((m) => (
          <span key={m.id}>{m.staticData.getTitle()}</span>
        ))}
    </nav>
  )
}
```

### Layout Visibility Control

```tsx
export const Route = createFileRoute('/admin')({
  staticData: { showNavbar: false },
})

// In root
function RootComponent() {
  const showNavbar = useMatches({
    select: (matches) =>
      !matches.some((m) => m.staticData?.showNavbar === false),
  })

  return showNavbar ? (
    <Navbar><Outlet /></Navbar>
  ) : (
    <Outlet />
  )
}
```

### staticData vs Context

| staticData | context |
|---|---|
| Synchronous, defined at route creation | Can be async (via `beforeLoad`) |
| Available before loading starts | Can depend on params/search |
| Same for all instances of a route | Passed down and mergeable by children |

Use `staticData` for static route metadata. Use `context` for dynamic data or auth state.

---

See also: `patterns-params.md` (loaderDeps for search-param keying), `patterns-auth.md` (beforeLoad guards), `config-route-options.md` (loader, staleTime, gcTime options)
