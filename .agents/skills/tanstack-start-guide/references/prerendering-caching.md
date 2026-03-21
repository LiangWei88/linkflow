# TanStack Start Prerendering & Caching

## Static Prerendering (SSG)

Generate static HTML at build time:

```ts
tanstackStart({
  prerender: {
    enabled: true,
    crawlLinks: true,           // Discover pages from links
    autoStaticPathsDiscovery: true,
    concurrency: 14,
    filter: ({ path }) => !path.startsWith('/admin'),
  },
})
```

Routes excluded from auto-discovery:
- Dynamic routes (`/users/$userId`) — unless linked from crawled pages
- Layout routes (prefixed with `_`)
- Routes without components (API routes)

### Static Server Functions

> **Experimental:** Static server functions are experimental.

Cache server function results at build time as static JSON assets:

```tsx
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'

const myFn = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])  // MUST be last middleware
  .handler(async () => 'cached at build time')
```

**Build-time behavior:**
1. During prerendering, functions with `staticFunctionMiddleware` are executed
2. Results cached as static JSON under a derived key (function ID + params/payload hash)
3. Results used to prerender the page normally

**Runtime behavior:**
1. Prerendered page HTML is served with embedded server function data
2. Client mounts and hydrates the embedded data
3. Future client-side invocations fetch from the static JSON file (no server needed)

## Incremental Static Regeneration (ISR)

Uses standard HTTP cache headers — works with any CDN:

```tsx
export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => fetchPost(params.slug),
  headers: () => ({
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  }),
  staleTime: 5 * 60_000,  // 5 minutes client-side
})
```

### Cache-Control Directives

- `public` — Cacheable by CDN and browser
- `max-age=3600` — Fresh for 1 hour
- `s-maxage=3600` — Override max-age for shared caches (CDNs)
- `stale-while-revalidate=86400` — Serve stale while regenerating in background
- `immutable` — Never changes (hash-based assets)

### CDN-Specific Headers

```tsx
headers: () => ({
  'Cache-Control': 'public, max-age=3600',
  'CDN-Cache-Control': 'max-age=7200',      // Cloudflare
})
```

**Netlify `_headers` file:**

```
# public/_headers
/blog/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

### ISR with Server Routes (Middleware)

For API routes, use middleware to add cache headers:

```tsx
const cacheMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next()
  result.response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return result
})

export const Route = createFileRoute('/api/products/$productId')({
  server: {
    middleware: [cacheMiddleware],
    handlers: {
      GET: async ({ params }) => {
        const product = await db.products.findById(params.productId)
        return Response.json({ product })
      },
    },
  },
})
```

### On-Demand Revalidation

```tsx
// routes/api/revalidate.ts
export const Route = createFileRoute('/api/revalidate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { path, secret } = await request.json()
        if (secret !== process.env.REVALIDATE_SECRET) {
          return Response.json({ error: 'Invalid' }, { status: 401 })
        }
        // Purge CDN cache via provider API
        await purgeCache(path)
        return Response.json({ revalidated: true })
      },
    },
  },
})
```

### Common ISR Patterns

| Content Type | max-age | stale-while-revalidate | Notes |
|-------------|---------|----------------------|-------|
| Blog posts | 3600 (1h) | 86400 (24h) | Infrequent updates |
| E-commerce products | 300 (5m) | 3600 (1h) | Price/stock changes |
| Marketing pages | 86400 (24h) | 604800 (7d) | Rarely updated |
| User-specific | private, 60 | — | Not CDN-cacheable |

### ETag Validation

```tsx
const etagMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next()
  const body = await result.response.clone().text()
  const etag = crypto.createHash('md5').update(body).digest('hex')
  result.response.headers.set('ETag', `"${etag}"`)
  return result
})
```

### Vary Headers

```tsx
headers: () => ({
  'Cache-Control': 'public, max-age=3600',
  'Vary': 'Accept, Accept-Encoding',
})
```

### Debugging ISR

```bash
# Check cache headers
curl -I https://myapp.com/blog/my-post

# Force cache miss
curl -H "Cache-Control: no-cache" https://myapp.com/blog/my-post
```

Monitor: cache hit rate, revalidation time, TTFB (Time to First Byte).

## Selective SSR

Control SSR behavior per route:

| Value | beforeLoad/loader | Component rendering |
|-------|------------------|-------------------|
| `true` (default) | Server during SSR | Server rendered |
| `false` | Client only (hydration) | Client rendered |
| `'data-only'` | Server during SSR | Client rendered |
| Function | Dynamic based on params/search | Dynamic |

**Global default:** Configure default SSR behavior for all routes via `createStart`:

```tsx
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => ({
  defaultSsr: false,  // All routes default to client-only
}))
```

```tsx
export const Route = createFileRoute('/dashboard')({
  ssr: false,  // No SSR — client only
})

export const Route = createFileRoute('/posts/$postId')({
  ssr: 'data-only',  // Fetch data on server, render on client
})

// Dynamic SSR decision
export const Route = createFileRoute('/docs/$type')({
  ssr: ({ params }) => {
    if (params.status === 'success' && params.value.type === 'sheet') return false
    return true
  },
})
```

The `ssr` function runs only on the server during the initial request and is stripped from the client bundle.

**Inheritance:** Child routes inherit parent SSR settings. Can only become MORE restrictive (true → data-only → false).

**Fallback:** For routes with `ssr: false` or `'data-only'`, the `pendingComponent` renders as server fallback. Configure defaults via `defaultPendingComponent` and control minimum display time with `minPendingMs` (per-route) or `defaultPendingMinMs` (router-level).

### Disabling SSR on Root Route

Use `shellComponent` for the HTML shell (always SSR'd):

```tsx
export const Route = createRootRoute({
  ssr: false,
  shellComponent: ({ children }) => (
    <html><head><HeadContent /></head><body>{children}<Scripts /></body></html>
  ),
  component: () => <div><h1>Client rendered</h1><Outlet /></div>,
})
```

## SPA Mode

Ship static HTML shell, hydrate on client:

**Benefits:** Easier to deploy, cheaper hosting (static files), simpler client-side only architecture.
**Caveats:** Slower time to full content, less SEO-friendly.

```ts
tanstackStart({
  spa: { enabled: true },
})
```

- Generates `/_shell.html` with root route only
- All 404s rewrite to shell
- Server functions and server routes still work
- Configure CDN redirects for proper routing

```
# Netlify _redirects
/_serverFn/* /_serverFn/:splat 200
/api/* /api/:splat 200
/* /_shell.html 200
```

### Shell Mask Path

Configure the shell mask path (default: `/`):

```ts
tanstackStart({
  spa: { enabled: true, maskPath: '/app' },
})
```

### Router `isShell()` Check

Conditionally render content based on shell vs. full app:

```tsx
function RootComponent() {
  const router = useRouter()
  if (router.isShell()) return <LoadingSpinner />
  return <Outlet />
}
```

**Note:** Root route loaders and server functions run during shell prerendering, so dynamic data can be included in the shell.

## CDN Asset URLs

> **Experimental:** `transformAssetUrls` is experimental.

Rewrite asset URLs at runtime for CDN delivery. Rewrites: `<link rel="modulepreload">`, `<link rel="stylesheet">`, client entry `<script>`.

### String Prefix (Simplest)

```tsx
const handler = createStartHandler({
  handler: defaultStreamHandler,
  transformAssetUrls: process.env.CDN_ORIGIN || '',
})
export default createServerEntry({ fetch: handler })
```

### Callback (Per-Type Control)

```tsx
transformAssetUrls: ({ url, type }) => {
  if (type === 'clientEntry') return url  // Leave entry unchanged
  return `https://cdn.example.com${url}`
}
```

`type` values: `'modulepreload'` | `'stylesheet'` | `'clientEntry'`.

### Object Form (Explicit Cache Control)

For per-request transforms (e.g., geo-routing based on headers):

```tsx
transformAssetUrls: {
  transform: ({ url, type }) => {
    const region = getRequest().headers.get('x-region') || 'us'
    return `https://cdn-${region}.example.com${url}`
  },
  cache: false,  // Per-request (default: true — cached after first request)
}
```

### createTransform Factory

For async work once per manifest computation (e.g., fetch CDN origin from service):

```tsx
transformAssetUrls: {
  cache: false,
  async createTransform(ctx) {
    if (ctx.warmup) return ({ url }) => url
    const cdnBase = await fetchCdnBaseForRegion(ctx.request.headers.get('x-region') || 'us')
    return ({ url }) => `${cdnBase}${url}`
  },
}
```

### Caching Behavior

| Form | Default cache | Behavior |
|------|--------------|----------|
| String prefix | `true` | Computed once, cached forever in prod |
| Callback | `true` | Runs once on first request, cached |
| Object `cache: true` | `true` | Same as above |
| Object `cache: false` | `false` | Deep-clones and transforms on every request |

**Warmup:** Set `warmup: true` with `cache: true` to compute manifest at server startup (prod only).

**Dev mode:** In development (`TSS_DEV_SERVER`), caching is always skipped regardless of the `cache` setting.

### Important: Set `base: ''` for Client-Side Navigation

`transformAssetUrls` only rewrites SSR HTML. Client-side `import()` calls use paths baked at build time. With default `base: '/'`, lazy-loaded chunks resolve against app server, not CDN.

```ts
// vite.config.ts
export default defineConfig({ base: '' })
```

| `base` setting | SSR assets | Client-side chunks |
|---------------|-----------|-------------------|
| `'/'` (default) | CDN | App server |
| `''` | CDN | CDN (relative to entry) |

**Does NOT cover:** Asset imports in components (`import logo from './logo.svg'`). For those, use Vite's `experimental.renderBuiltUrl`.

For component asset imports, use Vite's `experimental.renderBuiltUrl`:

```ts
// vite.config.ts
export default defineConfig({
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') return { relative: true }
      return `https://cdn.example.com/${filename}`
    },
  },
})
```

## See Also

- [Configuration](configuration.md) — tanstackStart plugin options for prerender, spa, sitemap
- [Deployment](deployment.md) — CDN setup per hosting provider
- [SEO & LLMO](seo-llmo.md) — SEO benefits of prerendering
- [Middleware](api-middleware.md) — createMiddleware for cache headers
- [Troubleshooting](troubleshooting.md) — caching and SSR issues
