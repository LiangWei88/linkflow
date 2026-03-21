# TanStack Start Troubleshooting

## Hydration Errors

### Problem: Server HTML differs from client render

**Common causes:** `Date.now()`, `Math.random()`, `Intl` (locale/timezone), responsive-only logic, feature flags, random IDs, user preferences.

### Strategy 1: Make server and client match

Use deterministic values. Source locale/timezone from cookies or `Accept-Language` header:

```tsx
// src/start.ts — Global middleware to set locale/timezone
const localeTzMiddleware = createMiddleware().server(async ({ next }) => {
  const header = getRequestHeader('accept-language')
  const locale = getCookie('locale') || header?.split(',')[0] || 'en-US'
  const timeZone = getCookie('tz') || 'UTC'
  setCookie('locale', locale, { path: '/', maxAge: 365 * 24 * 60 * 60 })
  return next({ context: { locale, timeZone } })
})
```

Wire into global middleware via `src/start.ts`:

```tsx
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => ({
  requestMiddleware: [localeTzMiddleware],
}))
```

### Strategy 2: Let client tell its environment

Set a cookie from client for timezone, then SSR uses UTC until cookie exists:

```tsx
import { ClientOnly } from '@tanstack/react-router'

function SetTimeZoneCookie() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    document.cookie = `tz=${tz}; path=/; max-age=31536000`
  }, [])
  return null
}

// In root route:
<ClientOnly fallback={null}><SetTimeZoneCookie /></ClientOnly>
```

### Strategy 3: Make it client-only

```tsx
<ClientOnly fallback={<span>--</span>}>
  <RelativeTime ts={someTs} />
</ClientOnly>
```

### Strategy 4: Disable SSR for the route

```tsx
export const Route = createFileRoute('/unstable')({
  ssr: 'data-only',  // or false
  component: () => <ExpensiveViz />,
})
```

### Strategy 5: Last resort suppression

```tsx
<time suppressHydrationWarning>{new Date().toLocaleString()}</time>
```

### Hydration Checklist

- [ ] Use deterministic inputs — no `Date.now()`, `Math.random()`, random IDs
- [ ] Prefer cookies for client context; fallback to `Accept-Language` header
- [ ] Use `<ClientOnly>` for inherently dynamic UI (timezones, locale formatting)
- [ ] Use Selective SSR (`ssr: 'data-only'` or `false`) when server HTML cannot be stable
- [ ] Avoid blind suppression — use `suppressHydrationWarning` sparingly as last resort

## Environment Variable Issues

### Variable is undefined on client

**Cause:** Missing `VITE_` prefix.

```bash
# Won't work on client
API_KEY=abc123

# Works on client
VITE_API_KEY=abc123
```

**Also:** Restart dev server after adding new variables.

### Secret exposed to client bundle

**Cause:** Used `VITE_` prefix on a secret, or accessed `process.env` in a loader (isomorphic!).

```tsx
// WRONG — loader runs on BOTH server and client
export const Route = createFileRoute('/users')({
  loader: () => {
    const secret = process.env.SECRET  // Exposed!
    return fetch(`/api?key=${secret}`)
  },
})

// CORRECT — use server function
const getUsers = createServerFn().handler(() => {
  const secret = process.env.SECRET  // Server-only
  return fetch(`/api?key=${secret}`)
})

export const Route = createFileRoute('/users')({
  loader: () => getUsers(),
})
```

### Variable not updating

1. Restart dev server
2. Check you're modifying the correct `.env` file
3. `.env.local` overrides `.env`

### TypeScript error on env var

Add to `src/env.d.ts`:

```ts
interface ImportMetaEnv {
  readonly VITE_MY_VAR: string
}
```

### Runtime client env vars in production

`VITE_` vars are replaced at build time. For runtime vars, pass from server:

```tsx
const getConfig = createServerFn({ method: 'GET' }).handler(() => process.env.RUNTIME_VAR)

export const Route = createFileRoute('/')({
  loader: async () => ({ config: await getConfig() }),
})
```

## Loader Mistakes

### Assuming loaders are server-only

**Critical:** Route loaders are **isomorphic** — they run on server during SSR AND on client during navigation.

```tsx
// WRONG
loader: () => {
  const db = require('./db')  // Fails on client!
  return db.query('SELECT ...')
}

// CORRECT
const getData = createServerFn().handler(async () => {
  const db = require('./db')
  return db.query('SELECT ...')
})

loader: () => getData()
```

## Server Function Issues

### Dynamic imports don't work

```tsx
// WRONG — can cause bundler issues
const { getUser } = await import('~/utils/users.functions')

// CORRECT — static imports are safe
import { getUser } from '~/utils/users.functions'
```

### Server function not tree-shaking

Ensure server functions are in separate files (`.functions.ts`) and statically imported.

### Server Function Debugging

**Server function not executing:**
1. Check HTTP method matches (GET vs POST)
2. Verify file paths are correct and files exist
3. Check server console (not browser console) for errors
4. Ensure no client-only APIs used in handler

**Server function logging:**

```tsx
const myFn = createServerFn().handler(async ({ data }) => {
  const start = Date.now()
  try {
    const result = await doWork(data)
    console.log(`[serverFn] completed in ${Date.now() - start}ms`)
    return result
  } catch (error) {
    console.error(`[serverFn] failed after ${Date.now() - start}ms`, error)
    throw error
  }
})
```

## Form Submission Issues

- **Form not submitting:** Ensure `e.preventDefault()` is called, check `type="submit"` on button
- **Data not reaching server:** Verify `inputValidator` matches the shape of submitted data
- **State not updating after mutation:** Call `router.invalidate()` to re-run loaders after server function completes
- **Network errors:** Check browser DevTools Network tab for failed requests, verify server is running

## Routing Issues

### Route not found / 404

- Check file naming matches expected path
- Ensure `export const Route = createFileRoute(...)` is exported
- Run dev server to regenerate `routeTree.gen.ts`
- Check for duplicate route paths (e.g., `routes/users.ts` AND `routes/users/index.ts`)

### TypeScript errors in route path

The path string in `createFileRoute('/path')` is auto-managed by the router plugin. Run `npm run dev` to auto-fix.

## Build & Deploy Issues

### Plugin order matters

```ts
// WRONG
plugins: [viteReact(), tanstackStart()]

// CORRECT
plugins: [tanstackStart(), viteReact()]
```

### verbatimModuleSyntax breaks builds

Do NOT enable `verbatimModuleSyntax` in tsconfig — it causes server bundles to leak into client.

### Missing routeTree.gen.ts

This file is auto-generated on first run. Run `npm run dev` to generate it.

## Middleware Issues

### Middleware execution order

Execution is dependency-first: global middleware → server function middleware → handler.

```
globalMiddleware1 → globalMiddleware2 → a → b → c → d → handler
```

### Client context not reaching server

Client context is NOT sent by default. Must use `sendContext`:

```tsx
.client(async ({ next }) => {
  return next({
    sendContext: { workspaceId: '123' },  // Explicitly sent
  })
})
```

### Client-sent context security

`sendContext` is type-safe but NOT runtime-validated. If passing dynamic user-generated data via context, validate on the server:

```tsx
.server(async ({ next, context }) => {
  const workspaceId = zodValidator(z.number()).parse(context.workspaceId)
  return next()
})
```

### Middleware type mismatch

- Request middleware: Cannot depend on server function middleware
- Server function middleware: Can depend on both types
- Request middleware does not have `.client()` method

## Build & Production Issues

### Build errors from missing env vars in production

**Cause:** `VITE_` vars are replaced at build time. If not set during build, they become undefined.

```bash
# Wrong — variable not set during build
npm run build

# Correct — set at build time
VITE_API_KEY=abc123 npm run build
```

**Also:** Configure variables on hosting platform before building. Validate required vars at build time.

### staticNodeEnv disabled but NODE_ENV not set

**Cause:** Disabled `server.build.staticNodeEnv` without setting `NODE_ENV=production` at runtime.

**Result:** React runs in development mode (significantly slower, extra warnings).

**Fix:** Always set `NODE_ENV=production` when running in production with `staticNodeEnv: false`.

### Request cancellation

Server functions support `AbortSignal` for long-running operations. If a client navigates away or a request is cancelled, the operation will abort. Handle this gracefully in server function handlers.

## Performance Issues

### Slow dev server

Check you're using Vite (not accidentally running through another bundler). TanStack Start should have instant startup.

### Large client bundle

- Check for accidental server code in client bundle (run bundle analysis)
- Ensure server functions use static imports
- Verify environment tree-shaking is working

**Analyze your bundle:**

```bash
npm run build
# Check dist/client/ for server-only imports that shouldn't be there
```

## Production Checklist

- [ ] All secrets use `process.env` (no `VITE_` prefix)
- [ ] Client vars use `VITE_` prefix
- [ ] `.env.local` in `.gitignore`
- [ ] Production env vars configured on hosting platform
- [ ] Required env vars validated at startup
- [ ] No `process.env` in loaders (use server functions)
- [ ] `<HeadContent />` in `<head>` and `<Scripts />` in `<body>`
- [ ] `tanstackStart()` before `viteReact()` in plugins
- [ ] `verbatimModuleSyntax` NOT enabled
- [ ] Bundle analyzed for server code leaks
- [ ] Error boundaries configured
- [ ] `<ClientOnly>` used for browser-only components

## See Also

- [Server Functions](api-server-functions.md) — correct createServerFn usage, validation
- [Middleware](api-middleware.md) — correct createMiddleware usage, execution order
- [Configuration](configuration.md) — environment variables, Vite config, TypeScript settings
- [Auth & Sessions](auth-sessions.md) — authentication debugging, session issues
- [Data Loading & Streaming](data-streaming.md) — loader patterns, avoiding common mistakes
- [Deployment](deployment.md) — build & deploy troubleshooting per provider
