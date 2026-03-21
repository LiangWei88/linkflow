# TanStack Start API — Middleware

## createMiddleware(options?)

Options: `{ type: 'request' | 'function' }` (default: 'request').

**Request middleware** (runs for all server requests):

```tsx
const logger = createMiddleware()          // type: 'request' is default
  .middleware([parentMiddleware])           // Depend on other middleware
  .server(async ({ next, context, request }) => {
    // Pre-processing
    const result = await next({ context: { startTime: Date.now() } })
    // Post-processing
    return result
  })
```

**Server function middleware** (runs for server functions, supports client-side):

```tsx
const auth = createMiddleware({ type: 'function' })
  .middleware([parentMiddleware])
  .inputValidator(zodValidator(schema))    // Optional input validation
  .client(async ({ next, context }) => {
    // Runs on CLIENT before RPC
    const result = await next({
      headers: { Authorization: `Bearer ${token}` },
      sendContext: { workspaceId: '123' },  // Send to server
    })
    // result.context has server-sent context
    return result
  })
  .server(async ({ next, data, context }) => {
    // Runs on SERVER
    return next({
      context: { user: await getUser() },
      sendContext: { serverTime: new Date() },  // Send to client
    })
  })
```

**Method order:** TypeScript enforces the order `.middleware()` -> `.inputValidator()` -> `.client()` -> `.server()`. Calling them out of order is a compile error.

## createStart

Global configuration via `src/start.ts`:

```tsx
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => ({
  requestMiddleware: [loggerMiddleware],     // All requests
  functionMiddleware: [authMiddleware],      // All server functions
  defaultSsr: true,                          // Default SSR behavior
  serverFns: { fetch: customFetch },         // Global custom fetch
}))
```

## Custom Fetch in Middleware

Provide a custom `fetch` implementation via client middleware to control how server function requests are made:

```tsx
import { createMiddleware } from '@tanstack/react-start'
import type { CustomFetch } from '@tanstack/react-start'

const customFetchMiddleware = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const customFetch: CustomFetch = async (url, init) => {
      console.log('Request starting:', url)
      const response = await fetch(url, init)
      return response
    }
    return next({ fetch: customFetch })
  },
)
```

Also available at call site:

```tsx
await myServerFn({ data: { name: 'John' }, fetch: myCustomFetch })
```

### Fetch Override Precedence

| Priority | Source | Description |
|----------|--------|-------------|
| 1 (highest) | Call site | `serverFn({ fetch: customFetch })` |
| 2 | Later middleware | Last middleware in chain that provides `fetch` |
| 3 | Earlier middleware | First middleware in chain that provides `fetch` |
| 4 | createStart | `createStart({ serverFns: { fetch: customFetch } })` |
| 5 (lowest) | Default | Global `fetch` function |

Custom fetch only applies on the client side. During SSR, server functions are called directly without going through fetch.

### Header Merging Across Middleware

When multiple middlewares set headers, they are merged. Later middlewares can add new headers or override earlier ones:

```tsx
const first = createMiddleware({ type: 'function' }).client(async ({ next }) =>
  next({ headers: { 'X-Request-ID': '12345', 'X-Source': 'first' } })
)

const second = createMiddleware({ type: 'function' }).client(async ({ next }) =>
  next({ headers: { 'X-Timestamp': Date.now().toString(), 'X-Source': 'second' } })
)
// Final: X-Request-ID from first, X-Timestamp from second, X-Source overridden by second
```

**Header precedence:** Earlier middleware < Later middleware < Call-site headers.

### createHandlers (Per-Handler Middleware)

Use `createHandlers` to apply middleware to specific server route handlers:

```tsx
export const Route = createFileRoute('/api/data')({
  server: {
    middleware: [authMiddleware],  // Applies to all handlers
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async ({ request }) => Response.json({ data: 'public' }),
        POST: {
          middleware: [validationMiddleware],  // Only for POST
          handler: async ({ request }) => {
            const body = await request.json()
            return Response.json({ created: true })
          },
        },
      }),
  },
})
```

## See Also

- [Routing & Components](api-routing.md) — createFileRoute, route hooks, components, navigation
- [Server Functions](api-server-functions.md) — createServerFn, validation, streaming, server context
- [Server & Client Entry](server-entry.md) — custom server entry, request context
- [Auth & Sessions](auth-sessions.md) — authentication middleware patterns
- [Troubleshooting](troubleshooting.md) — middleware issues, execution order
