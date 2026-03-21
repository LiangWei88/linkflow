# Configuration: Route Options (createFileRoute / createRoute)

All options accepted by `createFileRoute('/path')({...})` or `createRoute({...})`.

---

## Identity

| Option | Type | Description |
|--------|------|-------------|
| `path` | `string` | URL path pattern for this route. Auto-set in file-based routing. In code-based routing, supports `$param` for dynamic segments and `$` for splat. |
| `id` | `string` | Unique route ID. Used for pathless routes that only contribute layout/context. Mutually exclusive with `path`. |
| `getParentRoute` | `() => Route` | Returns the parent route. Only used in code-based routing. |

---

## Components

| Option | Type | Description |
|--------|------|-------------|
| `component` | `RouteComponent` | The component rendered when this route matches. Has access to `Route.useLoaderData()`, `Route.useSearch()`, `Route.useParams()`. |
| `errorComponent` | `ErrorRouteComponent` | Error boundary component. Receives `{ error, reset }`. |
| `pendingComponent` | `RouteComponent` | Loading/pending component shown while the loader is resolving (after `pendingMs` elapses). |
| `notFoundComponent` | `NotFoundRouteComponent` | 404 component shown when `notFound()` is thrown in the loader. Receives `{ data }`. |

```tsx
export const Route = createFileRoute('/posts/$postId')({
  component: PostPage,
  pendingComponent: () => <div>Loading post...</div>,
  errorComponent: ({ error, reset }) => (
    <div>
      <p>Failed to load: {error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  ),
  notFoundComponent: () => <div>Post not found</div>,
})
```

---

## Search Params

| Option | Type | Description |
|--------|------|-------------|
| `validateSearch` | `ZodSchema \| (rawSearch: Record<string, unknown>) => TSearch` | Zod schema or validator function to parse and validate URL search params. |
| `search.middlewares` | `SearchMiddleware[]` | Array of search middleware functions for controlling search param behavior across navigations. |

```tsx
import { retainSearchParams, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/products')({
  validateSearch: z.object({
    page: z.number().catch(1),
    sort: z.enum(['name', 'price', 'date']).catch('name'),
    q: z.string().optional(),
  }),
  search: {
    middlewares: [
      retainSearchParams(['q']),
      stripSearchParams({ page: 1, sort: 'name' }),
    ],
  },
})
```

---

## Data Loading

| Option | Type | Description |
|--------|------|-------------|
| `loader` | `(opts: LoaderFnContext) => Promise<TData> \| TData` | Data loader function called before the route component renders. Receives `{ params, search, context, deps, abortController, preload, cause }`. |
| `loaderDeps` | `(opts: { search: TSearch }) => TDeps` | Extract reactive dependencies from search params. When the returned value changes, the loader re-runs. |
| `beforeLoad` | `(opts: BeforeLoadContext) => Promise<void \| TContext> \| void \| TContext` | Pre-load hook. Can return additional context, throw `redirect()`, or throw `notFound()`. |
| `staleTime` | `number` | Override `defaultStaleTime` for this route. |
| `shouldReload` | `boolean \| ((opts) => boolean)` | Control when the loader re-runs. |
| `pendingMs` | `number` | Override `defaultPendingMs` for this route. |
| `pendingMinMs` | `number` | Override `defaultPendingMinMs` for this route. |
| `gcTime` | `number` | Override `defaultGcTime` for this route. |
| `preload` | `boolean` | Override default preload behavior. Set to `false` to disable preloading. |
| `params.parse` | `(rawParams: Record<string, string>) => TParams` | Custom parser for path params. |
| `params.stringify` | `(params: TParams) => Record<string, string>` | Custom serializer for path params. |
| `wrapInSuspense` | `boolean` | Force a Suspense boundary around this route's component. |

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loaderDeps: ({ search }) => ({ page: search.page }),

  loader: async ({ params, deps, context, abortController }) => {
    const post = await context.queryClient.ensureQueryData({
      queryKey: ['post', params.postId, deps.page],
      queryFn: () => fetchPost(params.postId, { page: deps.page }),
      signal: abortController.signal,
    })
    if (!post) throw notFound()
    return { post }
  },

  beforeLoad: ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { user: context.auth.user }
  },

  staleTime: 60_000,
  pendingMs: 200,
  pendingMinMs: 300,
})
```

---

## Lifecycle Callbacks

| Option | Type | Description |
|--------|------|-------------|
| `onError` | `(error: Error) => void` | Called when the loader throws an error |
| `onEnter` | `(match: RouteMatch) => void` | Called when the route is first entered |
| `onStay` | `(match: RouteMatch) => void` | Called when the route stays active but params/search change |
| `onLeave` | `(match: RouteMatch) => void` | Called when the route is left |
| `onCatch` | `(error: Error, errorInfo: ErrorInfo) => void` | Called when this route's error boundary catches an error |

```tsx
export const Route = createFileRoute('/analytics')({
  onEnter: () => analytics.trackPageView('/analytics'),
  onStay: () => analytics.trackPageView('/analytics'),
  onLeave: () => analytics.flush(),
  onError: (error) => errorReporting.capture(error),
})
```

---

## SSR and Head Management

| Option | Type | Description |
|--------|------|-------------|
| `head` | `(opts: { params, search, loaderData }) => HeadConfig` | Return `{ title, meta, links, scripts }` for the document head. |
| `scripts` | `(opts: { params, search, loaderData }) => ScriptTag[]` | Return array of script objects injected into the document body |
| `headers` | `(opts: { loaderData }) => Record<string, string>` | Return custom HTTP headers for SSR responses |
| `ssr` | `boolean \| SSRConfig` | SSR configuration. Set to `false` to disable SSR for this route. |

```tsx
export const Route = createFileRoute('/posts/$postId')({
  head: ({ loaderData }) => ({
    title: loaderData.post.title,
    meta: [
      { name: 'description', content: loaderData.post.excerpt },
      { property: 'og:title', content: loaderData.post.title },
      { property: 'og:image', content: loaderData.post.image },
    ],
    links: [
      { rel: 'canonical', href: `https://example.com/posts/${loaderData.post.id}` },
    ],
  }),
  headers: ({ loaderData }) => ({
    'Cache-Control': loaderData.post.isPublished
      ? 'public, max-age=3600'
      : 'no-store',
  }),
})
```

---

## Advanced Route Options

| Option | Type | Description |
|--------|------|-------------|
| `staticData` | `Record<string, unknown>` | Static data attached to the route match. Accessible via `useMatches()` without running the loader. |
| `context` | `(opts: { params, search }) => TContext` | Additional context merged into the route context for this route and its children. |
| `remountDeps` | `(opts: { params, search }) => any` | Dependencies that trigger a full component remount when they change. |
| `codeSplitGroupings` | `string[][]` | Per-route override for code split groupings. |
| `meta` | Deprecated | Use `head()` instead. |

```tsx
export const Route = createFileRoute('/posts/$postId')({
  staticData: {
    breadcrumb: 'Post Detail',
    navGroup: 'content',
  },
  remountDeps: ({ params }) => params.postId,
})
```

---

See also: `config-router-options.md` (global router defaults), `patterns-data.md` (loader patterns), `patterns-params.md` (search param validation)
