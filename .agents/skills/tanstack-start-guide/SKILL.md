---
name: tanstack-start-guide
description: >-
  Guide for TanStack Start — a full-stack React framework powered by TanStack Router and Vite
  with SSR, streaming, server functions, server routes, and middleware.
  Use when user asks to "create a TanStack Start app", "set up server functions",
  "configure TanStack Start", "add SSR to React app", "create API routes with Start",
  "set up middleware in Start", "deploy TanStack Start", "use createServerFn",
  "add authentication in Start", "stream data from server functions",
  "prerender pages", "use SPA mode", "migrate from Next.js to TanStack Start",
  "set up Tailwind with Start", "configure environment variables",
  "use sessions in Start", "add SEO meta tags", "use createMiddleware",
  "configure createStart", "set up src/start.ts",
  or asks about @tanstack/react-start, createStart, server function validation, file-based routing,
  selective SSR, Start deployment, ISR, CDN assets, observability, or LLMO optimization.
  Do NOT use for TanStack Router-only questions (without SSR/Start context),
  Next.js-only questions, Remix questions, or React Router v7 questions.
metadata:
  author: skill-maker
  version: 1.1.0
  source: documentation-analysis
  source-docs: source/tanstack/start/
  category: react-framework
  tags:
    - tanstack
    - react
    - full-stack
    - ssr
    - server-functions
    - vite
    - typescript
    - routing
---

# TanStack Start Guide

TanStack Start is a full-stack React framework powered by TanStack Router and Vite. It provides SSR, streaming, server functions, server routes, middleware, and universal deployment. If you only need client-side routing without SSR, streaming, server functions, or middleware, use TanStack Router directly instead of Start. Not for Next.js, Remix, or React Router.

**Key differentiators:** End-to-end type safety, composable middleware (client + server), selective SSR per route, deployment-agnostic (any Vite-compatible host), explicit over implicit patterns.

**RSC support:** Available via Composite Components — server-produced React components that the client fetches, caches, and streams. See `references/migration.md` for details.

## Quick Start

```bash
pnpm create @tanstack/start@latest
# or
npm create @tanstack/start@latest
```

Or clone an official example:

```bash
npx gitpick TanStack/router/tree/main/examples/react/EXAMPLE_SLUG my-project
```

Official examples: `start-basic`, `start-basic-auth`, `start-counter`, `start-basic-react-query`, `start-clerk-basic`, `start-convex-trellaux`, `start-supabase-basic`, `start-trellaux`, `start-workos`, `start-material-ui`.

### Manual Setup

Install dependencies:

```bash
npm i @tanstack/react-start @tanstack/react-router react react-dom
npm i -D vite @vitejs/plugin-react typescript vite-tsconfig-paths @types/node @types/react @types/react-dom
```

### Required Files

**vite.config.ts** — Vite plugin configuration:

```ts
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    viteReact(), // MUST come after tanstackStart()
  ],
})
```

> Alternative React plugins: `@vitejs/plugin-react-swc` or `@vitejs/plugin-react-oxc` can replace `@vitejs/plugin-react`.

**src/router.tsx** — Router configuration:

```tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({ routeTree, scrollRestoration: true })
}
```

**src/routes/__root.tsx** — Root route (HTML shell):

```tsx
/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  component: () => (
    <html><head><HeadContent /></head>
      <body><Outlet /><Scripts /></body>
    </html>
  ),
})
```

**package.json** scripts:

```json
{ "type": "module", "scripts": { "dev": "vite dev", "build": "vite build" } }
```

## Core Workflow

### 1. File-Based Routing

Routes live in `src/routes/`. The `routeTree.gen.ts` is auto-generated on `dev`/`build`.

| Path | Filename | Type |
|------|----------|------|
| `/` | `index.tsx` | Index |
| `/about` | `about.tsx` | Static |
| `/posts/:id` | `posts/$postId.tsx` | Dynamic |
| `/rest/*` | `rest/$.tsx` | Wildcard |
| Layout wrapper | `_layout.tsx` | Pathless layout |
| Grouped dir | `(group)/route.tsx` | Organization only |

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => fetchPost(params.postId),
  component: PostComponent,
})

function PostComponent() {
  const post = Route.useLoaderData()
  return <h1>{post.title}</h1>
}
```

### 2. Server Functions

Server-only logic callable from anywhere. Created with `createServerFn()`:

```tsx
import { createServerFn } from '@tanstack/react-start'

export const getUser = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    return await db.users.find(data.id) // Runs only on server
  })

// Call from loader, component, or other server function
const user = await getUser({ data: { id: '123' } })
```

**Validation with Zod:**

```tsx
import { z } from 'zod'

export const createPost = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ title: z.string().min(1), body: z.string() }))
  .handler(async ({ data }) => db.posts.create(data))
```

**Redirects & errors:**

```tsx
import { redirect, notFound } from '@tanstack/react-router'

export const requireAuth = createServerFn().handler(async () => {
  const user = await getSession()
  if (!user) throw redirect({ to: '/login' })
  return user
})
```

**Progressive enhancement (no JS):**

```tsx
// Server functions have a .url property for HTML forms
<form method="POST" action={createPost.url}>
  <input name="title" />
  <button type="submit">Create</button>
</form>
```

### 3. Middleware

Two types: **request middleware** (all requests) and **server function middleware** (server functions only).

```tsx
import { createMiddleware } from '@tanstack/react-start'

// Request middleware (server only)
const logger = createMiddleware().server(async ({ next, request }) => {
  console.log(request.url)
  return next()
})

// Server function middleware (client + server)
const auth = createMiddleware({ type: 'function' })
  .client(async ({ next }) => next({ headers: { Authorization: `Bearer ${getToken()}` } }))
  .server(async ({ next }) => next({ context: { user: await getUser() } }))
```

**Global middleware** via `src/start.ts`:

```tsx
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => ({
  requestMiddleware: [loggerMiddleware],
  functionMiddleware: [authMiddleware],
}))
```

### 4. Server Routes (API Endpoints)

```tsx
export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: async ({ request }) => Response.json({ message: 'Hello!' }),
      POST: async ({ request }) => {
        const body = await request.json()
        return Response.json({ received: body })
      },
    },
  },
})
```

### 5. Sessions

```tsx
import { useSession } from '@tanstack/react-start/server'

function useAppSession() {
  return useSession<{ userId?: string }>({
    password: process.env.SESSION_SECRET!,
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax' },
  })
}
```

## Key Rules & Constraints

1. **Loaders are ISOMORPHIC** — they run on server during SSR AND on client during navigation. Never access `process.env` secrets directly in loaders. Use `createServerFn()` instead.

2. **Environment variables** — Server: `process.env.ANY_VAR`. Client: only `import.meta.env.VITE_*` prefixed. Never prefix secrets with `VITE_`.

3. **Plugin order** — `tanstackStart()` MUST come before `viteReact()` in vite.config.ts.

4. **TypeScript** — Do NOT enable `verbatimModuleSyntax` (causes server bundle leaking into client). Required settings: `jsx: "react-jsx"`, `moduleResolution: "Bundler"`, `module: "ESNext"`.

5. **Server function imports** — Safe to statically import anywhere. Avoid dynamic imports for server functions.

6. **Execution boundaries** — Use `createServerOnlyFn()` for server-only utilities that throw on client. Use `createClientOnlyFn()` for browser-only utilities. Use `createIsomorphicFn()` for environment-specific implementations.

7. **Head management** — `<HeadContent />` in `<head>`, `<Scripts />` at end of `<body>`. Both required in root route.

8. **Raw Response** — Server functions can return `Response` objects directly for binary data or custom content types.

## Error Boundaries

Route-level error boundaries with default + per-route override:

```tsx
// src/router.tsx — default for all routes
export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: ({ error, reset }) => <ErrorComponent error={error} />,
  })
}

// Per-route override
export const Route = createFileRoute('/posts/$postId')({
  errorComponent: ({ error, reset }: ErrorComponentProps) => (
    <div><p>Error: {error.message}</p><button onClick={reset}>Retry</button></div>
  ),
})
```

## Common Errors

- **Hydration mismatch**: Caused by `Date.now()`, `Math.random()`, locale-dependent APIs in SSR. Fix: use `<ClientOnly>`, `useHydrated()`, or `suppressHydrationWarning`.
- **Env var undefined on client**: Missing `VITE_` prefix. Restart dev server after adding new vars.
- **Secret exposed to client**: Used `process.env` in loader (isomorphic!). Move to `createServerFn()`.
- **Bundle includes server code**: Check for accidental dynamic imports of server functions.

## Reference Files

- `references/api-routing.md` — Routing, createFileRoute, createRootRoute, route hooks, components, error boundaries, navigation
- `references/api-server-functions.md` — createServerFn, validation, streaming, server context utilities, useSession, environment functions, useServerFn
- `references/api-middleware.md` — createMiddleware, createStart, custom fetch, header merging, fetch override, createHandlers
- `references/server-entry.md` — Custom server/client entry, request context, handler callbacks, Cloudflare Workers extensions
- `references/configuration.md` — Vite config options, TypeScript, environment variables, path aliases, Tailwind CSS, server build config
- `references/auth-sessions.md` — Authentication (DIY + partners), sessions, route protection, RBAC, OAuth, password reset, rate limiting
- `references/data-streaming.md` — Data loading patterns, streaming (async generators, ReadableStream), cache control, TanStack Query integration
- `references/seo-llmo.md` — SEO meta tags, JSON-LD structured data, LLMO/AIO optimization, sitemaps, robots.txt, llms.txt
- `references/server-routes.md` — API endpoints, dynamic params, wildcard routes, request bodies, per-handler middleware, escaped file names
- `references/patterns.md` — Markdown rendering, database integration (Neon/Convex/Prisma), file organization, progressive enhancement, execution model, tutorials
- `references/deployment.md` — Cloudflare Workers, Netlify, Railway, Vercel, Node.js/Docker, Bun, Appwrite Sites, Nitro
- `references/prerendering-caching.md` — Static prerendering (SSG), ISR, selective SSR, SPA mode, CDN asset URLs
- `references/observability.md` — Sentry, New Relic, OpenTelemetry, health checks, metrics collection, logging
- `references/migration.md` — Next.js migration guide, framework comparison (Start vs Next.js vs React Router)
- `references/troubleshooting.md` — Hydration errors, env variable issues, loader mistakes, middleware problems, production checklist
