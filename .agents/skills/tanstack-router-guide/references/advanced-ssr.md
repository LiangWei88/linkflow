# Advanced: Server-Side Rendering

TanStack Router supports both non-streaming and streaming SSR. TanStack Start is the recommended approach for SSR, but manual setup is supported for integration with existing servers.

---

## Router Factory Pattern

Create a shared router factory so both server and client use the same configuration:

```tsx
// src/router.tsx
import { createRouter as createTanstackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function createRouter() {
  return createTanstackRouter({
    routeTree,
    defaultPreload: 'intent',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
```

---

## Non-Streaming SSR

Renders the entire page on the server and sends completed HTML to the client in a single response. Two approaches are available:

Using `defaultRenderHandler` (simpler, handles wrapping automatically):

```tsx
// src/entry-server.tsx
import {
  createRequestHandler,
  defaultRenderHandler,
} from '@tanstack/react-router/ssr/server'
import { createRouter } from './router'

export async function render({ request }: { request: Request }) {
  const handler = createRequestHandler({ request, createRouter })
  return await handler(defaultRenderHandler)
}
```

Using `renderRouterToString` (manual control over wrapping and providers):

```tsx
// src/entry-server.tsx
import {
  createRequestHandler,
  renderRouterToString,
  RouterServer,
} from '@tanstack/react-router/ssr/server'
import { createRouter } from './router'

export function render({ request }: { request: Request }) {
  const handler = createRequestHandler({ request, createRouter })

  return handler(({ request, responseHeaders, router }) =>
    renderRouterToString({
      request,
      responseHeaders,
      router,
      children: <RouterServer router={router} />,
    }),
  )
}
```

---

## Streaming SSR

Sends an initial HTML shell, then streams remaining content as it resolves. Ideal for pages with slow data fetching. Deferred promises in loaders are automatically streamed to the client.

Using `defaultStreamHandler` (simpler):

```tsx
import {
  createRequestHandler,
  defaultStreamHandler,
} from '@tanstack/react-router/ssr/server'
import { createRouter } from './router'

export async function render({ request }: { request: Request }) {
  const handler = createRequestHandler({ request, createRouter })
  return await handler(defaultStreamHandler)
}
```

Using `renderRouterToStream` (manual control):

```tsx
import {
  createRequestHandler,
  renderRouterToStream,
  RouterServer,
} from '@tanstack/react-router/ssr/server'
import { createRouter } from './router'

export function render({ request }: { request: Request }) {
  const handler = createRequestHandler({ request, createRouter })

  return handler(({ request, responseHeaders, router }) =>
    renderRouterToStream({
      request,
      responseHeaders,
      router,
      children: <RouterServer router={router} />,
    }),
  )
}
```

---

## Client Entry (RouterClient)

The client hydrates the server-rendered HTML using `RouterClient`:

```tsx
// src/entry-client.tsx
import { hydrateRoot } from 'react-dom/client'
import { RouterClient } from '@tanstack/react-router/ssr/client'
import { createRouter } from './router'

const router = createRouter()
hydrateRoot(document, <RouterClient router={router} />)
```

Key components:
- `RouterClient` -- Renders the app on the client and implements the `Wrap` component option on `Router`.
- `RouterServer` -- Renders the app on the server and implements the `Wrap` component option.
- `defaultRenderHandler` / `defaultStreamHandler` -- Convenience handlers that automatically wrap with `RouterServer`.
- `renderRouterToString` / `renderRouterToStream` -- Lower-level APIs for manual wrapping with `RouterServer` and custom providers.

---

## Automatic Loader Dehydration/Hydration

Resolved loader data is automatically dehydrated on the server and rehydrated on the client. No additional configuration is needed beyond the standard SSR setup. For streaming deferred data, use the streaming SSR setup.

---

## SSR with TanStack Query

```tsx
export function createRouter() {
  const queryClient = new QueryClient()

  return createTanstackRouter({
    routeTree,
    context: { queryClient },
    dehydrate: () => ({ queryClientState: dehydrate(queryClient) }),
    hydrate: (dehydrated) => {
      hydrate(queryClient, dehydrated.queryClientState)
    },
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
}
```

---

## Data Serialization

SSR data passes through a lightweight serializer. Supported types beyond standard JSON:

- `undefined`
- `Date`
- `Error`
- `FormData`

Complex types like `Map`, `Set`, or `BigInt` require custom serializers.

---

## Express Server Integration

The `createRequestHandler` requires a Web API `Request` object. For Express, convert between request/response formats:

```tsx
// src/entry-server.tsx
import { pipeline } from 'node:stream/promises'
import {
  RouterServer,
  createRequestHandler,
  renderRouterToString,
} from '@tanstack/react-router/ssr/server'
import { createRouter } from './router'
import type express from 'express'

export async function render({
  req,
  res,
  head = '',
}: {
  head?: string
  req: express.Request
  res: express.Response
}) {
  const url = new URL(req.originalUrl || req.url, 'https://localhost:3000').href
  const request = new Request(url, {
    method: req.method,
    headers: (() => {
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        headers.set(key, value as any)
      }
      return headers
    })(),
  })

  const handler = createRequestHandler({
    request,
    createRouter: () => {
      const router = createRouter()
      router.update({
        context: { ...router.options.context, head },
      })
      return router
    },
  })

  const response = await handler(({ responseHeaders, router }) =>
    renderRouterToString({
      responseHeaders,
      router,
      children: <RouterServer router={router} />,
    }),
  )

  res.statusMessage = response.statusText
  res.status(response.status)
  response.headers.forEach((value, name) => res.setHeader(name, value))
  return pipeline(response.body as any, res)
}
```

---

## Vite SSR Build Configuration

```ts
// vite.config.ts
import path from 'node:path'
import url from 'node:url'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    react(),
  ],
  build: isSsrBuild
    ? {
        ssr: true,
        outDir: 'dist/server',
        emitAssets: true,
        copyPublicDir: false,
        rollupOptions: {
          input: path.resolve(__dirname, 'src/entry-server.tsx'),
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
      }
    : {
        outDir: 'dist/client',
        emitAssets: true,
        copyPublicDir: true,
        rollupOptions: {
          input: path.resolve(__dirname, 'src/entry-client.tsx'),
        },
      },
}))
```

---

## SSR Troubleshooting

- **Hydration mismatches**: Use `suppressHydrationWarning` on elements modified by pre-hydration scripts (e.g., theme detection on `<html>`). Use `useIsomorphicLayoutEffect` for browser-only effects.
- **Bun runtime**: May encounter `Cannot find module "react-dom/server"`. Use Node.js compatibility or create Bun-specific builds.
- **Module resolution**: Configure `ssr.noExternal` and `ssr.external` in Vite for packages that need SSR bundling.
- **Automatic server history**: On the server, TanStack Router automatically uses `createMemoryHistory` instead of `createBrowserHistory`. This is handled by `RouterServer`.

---

## Deferred Data Loading (SSR Streaming)

Return unawaited promises from loaders to defer slow data. The router streams resolved data to the client as it becomes available.

### Basic Pattern

```tsx
import { createFileRoute, Await } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  loader: async () => {
    const fastData = await fetchFastData()       // Await critical data
    const slowDataPromise = fetchSlowData()       // Do NOT await

    return {
      fastData,
      deferredSlowData: slowDataPromise,          // Return promise directly
    }
  },
  component: PostComponent,
})

function PostComponent() {
  const { fastData, deferredSlowData } = Route.useLoaderData()

  return (
    <div>
      <h1>{fastData.title}</h1>
      <Await promise={deferredSlowData} fallback={<div>Loading...</div>}>
        {(data) => <div>{data.content}</div>}
      </Await>
    </div>
  )
}
```

The `defer()` utility is no longer required -- promises are automatically handled when returned from loaders without awaiting.

The `Await` component triggers the nearest suspense boundary until the promise resolves. If rejected, the serialized error is thrown to the nearest error boundary.

In React 19, use the `use()` hook instead of `<Await>`.

### SSR Streaming Lifecycle

**Server:**
1. Promises returned from loaders are tracked.
2. All loaders resolve; deferred promises are serialized and embedded in HTML.
3. Route renders; `<Await>` triggers suspense boundaries, allowing the server to stream HTML up to that point.
4. As deferred promises resolve, results (or errors) are streamed via inline `<script>` tags.

**Client:**
1. Client receives initial HTML.
2. `<Await>` components suspend with placeholder promises.
3. Streamed results resolve the placeholders, rendering content or throwing to error boundaries.

### With TanStack Query

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(slowDataOptions())        // Kick off, don't await
    await queryClient.ensureQueryData(fastDataOptions()) // Await critical data
  },
  component: PostComponent,
})

function PostComponent() {
  const fastData = useSuspenseQuery(fastDataOptions())
  return (
    <div>
      <h1>{fastData.data.title}</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <SlowDataComponent />
      </Suspense>
    </div>
  )
}

function SlowDataComponent() {
  const data = useSuspenseQuery(slowDataOptions())
  return <div>{data.data.content}</div>
}
```

### Caching and Invalidation

Streamed promises follow the same lifecycle as their associated loader data. They can be preloaded just like regular loader data.

---

See also: `advanced-head-scroll.md` (document head management), `config-router-options.md` (dehydrate/hydrate options), `config-route-options.md` (ssr, headers options)
