# TanStack Start Server & Client Entry

Both are optional — TanStack Start provides defaults.

**Custom server entry** (`src/server.ts`):

```tsx
import { createStartHandler, defaultStreamHandler, defineHandlerCallback } from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'

const handler = defineHandlerCallback((ctx) => defaultStreamHandler(ctx))

export default createServerEntry({
  fetch: createStartHandler(handler),
})
```

**Default handler import** — the simplest server entry uses the default handler:

```tsx
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request)
  },
})
```

The server entry is the unified entry point for SSR, server routes, and server function requests. It supports the WinterCG-compatible universal fetch handler format.

### Request Context (Typed)

Provide typed request context from server entry:

```tsx
declare module '@tanstack/react-start' {
  interface Register {
    server: { requestContext: { hello: string } }
  }
}

export default createServerEntry({
  async fetch(request) {
    return handler.fetch(request, { context: { hello: 'world' } })
  },
})
```

**Cloudflare Workers extensions:** When deploying to Cloudflare Workers, extend `server.ts` to handle queues, scheduled events, and Durable Objects.

**Custom client entry** (`src/client.tsx`):

```tsx
import { StartClient } from '@tanstack/react-start/client'
import { hydrateRoot } from 'react-dom/client'

hydrateRoot(document, <StartClient />)
```

**With error boundary and dev mode:**

```tsx
import { StartClient } from '@tanstack/react-start/client'
import { hydrateRoot } from 'react-dom/client'
import { StrictMode } from 'react'

const App = <StartClient />

hydrateRoot(
  document,
  import.meta.env.DEV ? <StrictMode>{App}</StrictMode> : App,
)
```

## See Also

- [Middleware](api-middleware.md) — createMiddleware, createStart
- [Server Functions](api-server-functions.md) — server context utilities, useSession
- [Deployment](deployment.md) — hosting-specific server entry customizations
- [Observability](observability.md) — New Relic/OpenTelemetry integration via server entry
- [Prerendering & Caching](prerendering-caching.md) — CDN asset URL transforms in server entry
- [Configuration](configuration.md) — Vite config, TypeScript settings
