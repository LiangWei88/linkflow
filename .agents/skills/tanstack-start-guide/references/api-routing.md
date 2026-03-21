# TanStack Start API — Routing & Components

## Routing

### Route Types

| Type | Filename | Description |
|------|----------|-------------|
| Index Route | `index.tsx` | Matched when URL exactly matches path |
| Static Route | `about.tsx` | Static path segment |
| Layout Route | `posts.tsx` | Parent with `<Outlet />` for children |
| Dynamic Route | `posts/$postId.tsx` | Captures path segment as param |
| Wildcard Route | `rest/$.tsx` | Captures remaining path as `_splat` |
| Pathless Layout | `_authed.tsx` | Groups routes under layout without path |
| Non-Nested Route | `post_.edit.tsx` | Un-nests from parent path |
| Grouped Directory | `(group)/route.tsx` | Groups routes in directory without affecting path |

**Non-nested routes** (`post_.edit.tsx`): Un-nests from parent, renders its own component tree. Useful when a route shares a URL prefix but not the parent layout.

### Nested Routing

Routes are nested based on file structure. For URL `/posts/123`:

```
<Root>          <- __root.tsx (always rendered)
  <Posts>       <- posts.tsx
    <Post />    <- posts/$postId.tsx
  </Posts>
</Root>
```

Each parent must render `<Outlet />` for child routes.

### Route Tree Generation

`routeTree.gen.ts` is auto-generated on `dev`/`build`. Contains the generated route tree and TS utilities for type safety. The path string in `createFileRoute('/path')` is auto-managed by the router plugin.

## Route Creation

### createFileRoute(path)

Creates a file-based route. The path string is auto-managed by the router plugin.

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  // Route options
  component: PostComponent,
  errorComponent: PostError,
  pendingComponent: PostPending,
  notFoundComponent: PostNotFound,

  // Data loading
  loader: async ({ params, context }) => fetchPost(params.postId),
  beforeLoad: async ({ params, context, location }) => {
    // Runs before loader, can add to context or redirect
    return { user: await getUser() }
  },

  // Head management
  head: ({ loaderData, params }) => ({
    meta: [{ title: loaderData.title }],
    links: [{ rel: 'canonical', href: `https://example.com/posts/${params.postId}` }],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify({...}) }],
  }),

  // Cache control
  staleTime: 10_000,      // Consider fresh for 10 seconds
  gcTime: 5 * 60_000,     // Keep in memory for 5 minutes

  // SSR control
  ssr: true,               // true | false | 'data-only' | function
  headers: () => ({ 'Cache-Control': 'public, max-age=3600' }),

  // Search param validation
  validateSearch: z.object({ page: z.number().optional() }),

  // Server routes (API endpoints)
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: async ({ request, params, context }) => Response.json({...}),
      POST: async ({ request, params, context }) => {
        const body = await request.json()
        return Response.json({ created: true })
      },
    },
  },
})
```

### createRootRoute(options)

Creates the root route (`__root.tsx`). Same options as `createFileRoute` plus `shellComponent`.

```tsx
import { createRootRoute, HeadContent, Scripts, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({ meta: [...], links: [...], scripts: [...] }),
  component: RootComponent,
  shellComponent: ShellComponent,  // For SPA mode: always SSR'd HTML shell
  errorComponent: RootError,
  notFoundComponent: RootNotFound,
})
```

### Route Hooks (within components)

```tsx
function PostComponent() {
  const data = Route.useLoaderData()       // Access loader data
  const params = Route.useParams()          // { postId: '123' }
  const search = Route.useSearch()          // Validated search params
  const context = Route.useRouteContext()    // Context from beforeLoad
  const router = useRouter()                // Router instance
  const navigate = useNavigate()            // Programmatic navigation
}
```

## Components

```tsx
import {
  Outlet,        // Renders child route (renders null if no match)
  HeadContent,   // Renders head tags (in <head>)
  Scripts,       // Renders body scripts (end of <body>)
  Link,          // Type-safe navigation link
  ErrorComponent, // Default error UI
  ClientOnly,    // <ClientOnly fallback={<Spinner />}><BrowserOnlyComponent /></ClientOnly>
} from '@tanstack/react-router'

import type { ErrorComponentProps } from '@tanstack/react-router'
// { error: Error; reset: () => void }
```

### Error Boundaries

Default error component for all routes (set in router config):

```tsx
export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: ({ error, reset }) => <ErrorComponent error={error} />,
  })
}
```

Per-route override:

```tsx
import { createFileRoute, ErrorComponent } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

function PostError({ error, reset }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute('/posts/$postId')({
  errorComponent: PostError,
})
```

Notes: `ErrorComponent` is a simple built-in UI you can replace. Call `reset()` to retry rendering. Errors thrown in `beforeLoad`/`loader` are caught by the boundary.

### useHydrated Hook

Returns whether the client has been hydrated. Useful for conditionally rendering content based on client-side data:

```tsx
import { useHydrated } from '@tanstack/react-router'

function TimeZoneDisplay() {
  const hydrated = useHydrated()
  const timeZone = hydrated
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC'
  return <div>Your timezone: {timeZone}</div>
}
```

**Behavior:** During SSR: `false`. First client render: `false`. After hydration: `true` (stays `true`).

## Navigation

```tsx
import { Link, useNavigate, useRouter } from '@tanstack/react-router'

// Declarative
<Link to="/posts/$postId" params={{ postId: '123' }} search={{ page: 1 }}>Post</Link>

// Programmatic
const navigate = useNavigate()
navigate({ to: '/posts/$postId', params: { postId: '123' } })

// Router instance
const router = useRouter()
router.invalidate()  // Re-run all loaders
```

## See Also

- [Server Functions](api-server-functions.md) — createServerFn, validation, streaming, server context
- [Middleware](api-middleware.md) — createMiddleware, createStart, custom fetch, header merging
- [Server & Client Entry](server-entry.md) — custom server entry, client entry, request context
- [Auth & Sessions](auth-sessions.md) — authentication middleware, session management
- [Data Loading & Streaming](data-streaming.md) — loader patterns, streaming with server functions
- [Configuration](configuration.md) — Vite plugin options, TypeScript config
- [Troubleshooting](troubleshooting.md) — routing issues, build problems
