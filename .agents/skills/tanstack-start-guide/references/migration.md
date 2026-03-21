# TanStack Start Migration & Comparison

## Framework Comparison (TanStack Start vs Next.js vs React Router)

### Key Differentiators

| Feature | TanStack Start | Next.js | React Router v7 |
|---------|---------------|---------|-----------------|
| SSR / Streaming SSR | Yes | Yes | Yes |
| Selective SSR (per-route) | Yes | Manual | Manual |
| SPA Mode | Yes | via "use client" | Yes |
| Built-in Client SWR Caching | Yes (Router) | fetch cache only | No |
| React Server Components | In development | Yes | Experimental |
| Server Function Client Middleware | Yes | No | No |
| Input Validation | Built-in | Manual | Manual |
| Dev Server Speed | Fast (Vite) | Slow (Webpack/Turbopack) | Fast (Vite) |
| Deployment Flexibility | Any Vite host | Optimized for Vercel | Multiple adapters |
| Type-First Architecture | Yes | No | No |
| Static Prerendering (SSG) | Yes | Yes | Yes |
| ISR | Yes (HTTP headers) | Yes (built-in) | Manual |
| Data Fetching Integration | TanStack Query | fetch cache | Manual |
| Built-in Devtools | Yes | No | Third-party |
| Form API | No | React 19 | Yes |
| Edge Runtime | Yes | Yes | Yes |
| Docker Support | Yes | Yes | Yes |

### When to Choose TanStack Start

- Best type safety for routing and server functions
- Deployment flexibility without vendor lock-in
- Composable middleware (client + server)
- Fine-grained SSR control per route
- Already using TanStack libraries (Query, Table, etc.)

### Philosophical Differences

- **TanStack Start:** Maximum developer freedom, explicit composable patterns, type-safety first
- **Next.js:** Production-ready defaults, RSC-first, best on Vercel, convention over configuration
- **React Router:** Web fundamentals, progressive enhancement, action-based mutations

**RSC status:** Next.js has full support; TanStack Start supports RSCs via **Composite Components** — server-produced React components that the client fetches, caches, streams, and assembles. The client owns composition; the server ships UI pieces. No new mental model — RSC payloads are treated as data, cached with standard SWR patterns (`staleTime`, `gcTime`) or CDN headers.

### Mental Model Gap

- **TanStack Start:** Interactive by default — components are traditional React, opt into server-only with `createServerFn()`
- **Next.js:** Server Components by default — components are server-rendered, opt into interactivity with `'use client'`

### Architecture Differences

- **Build pipeline:** Vite (instant startup, native ESM) vs Webpack/Turbopack
- **Runtime:** TanStack Start ships a minimal runtime. Next.js ships a substantial runtime.
- **Type system:** Start provides end-to-end compile-time type safety across client/server boundaries. Next.js has type gaps requiring runtime validation.

### Where Next.js Has the Advantage

- Largest content/tutorial ecosystem and community
- Deepest Vercel integration (analytics, preview deployments, ISR)
- Built-in image optimization (`next/image`) and font loading (`next/font`)
- Full React Server Components support
- Mature production track record

For custom server and client entry points (request context, CDN URL rewriting, monitoring), see [Server & Client Entry](server-entry.md).

## Migrate from Next.js

### Route Mapping

| Next.js | TanStack Start |
|---------|---------------|
| `src/app/layout.tsx` | `src/routes/__root.tsx` |
| `src/app/page.tsx` | `src/routes/index.tsx` |
| `src/app/posts/page.tsx` | `src/routes/posts.tsx` |
| `src/app/posts/[slug]/page.tsx` | `src/routes/posts/$slug.tsx` |
| `src/app/posts/[...slug]/page.tsx` | `src/routes/posts/$.tsx` |
| `src/app/api/endpoint/route.ts` | `src/routes/api/endpoint.ts` |

### Dynamic & Catch-All Route Migration

```tsx
// Next.js: [slug]/page.tsx with params prop
// TanStack Start: $slug.tsx with Route.useParams()
export const Route = createFileRoute('/posts/$slug')({
  component: () => {
    const { slug } = Route.useParams()
    return <Post slug={slug} />
  },
})

// Next.js: [...slug]/page.tsx
// TanStack Start: $.tsx with _splat param
export const Route = createFileRoute('/docs/$')({
  component: () => {
    const { _splat } = Route.useParams()  // "guides/getting-started"
    return <DocPage path={_splat} />
  },
})
```

### Key Changes

- `Link href=` → `Link to=`
- `next/image` → `@unpic/react` (Image)
- `'use server'` → `createServerFn().handler()`
- `export async function GET()` → `server: { handlers: { GET: async () => {...} } }`
- `next/font` → Fontsource + Tailwind CSS
- Metadata export → `head: () => ({...})`
- `params` prop → `Route.useParams()`
- `searchParams` → `Route.useSearch()`

### Fonts (Fontsource + Tailwind)

Replace `next/font` with [Fontsource](https://github.com/fontsource/fontsource):

```bash
npm i -D @fontsource-variable/dm-sans @fontsource-variable/jetbrains-mono
```

```css
/* src/styles/app.css */
@import 'tailwindcss' source('../');
@import '@fontsource-variable/dm-sans';
@import '@fontsource-variable/jetbrains-mono';

@theme inline {
  --font-sans: 'DM Sans Variable', sans-serif;
  --font-mono: 'JetBrains Mono Variable', monospace;
}
```

### Images (@unpic/react)

Replace `next/image` with [Unpic](https://unpic.pics/) — near drop-in replacement:

```tsx
import { Image } from '@unpic/react'

<Image src="/path/to/image.jpg" alt="Description" width={600} height={400} />
```

Note: `width` and `height` use numbers instead of strings.

### Data Fetching

```tsx
// Next.js: async component with await
// TanStack Start: loader + useLoaderData
export const Route = createFileRoute('/')({
  component: Page,
  loader: async () => {
    const res = await fetch('https://api.example.com/data')
    return res.json()
  },
})

function Page() {
  const data = Route.useLoaderData()
  return <div>{data.title}</div>
}
```

### routesDirectory Customization

To maintain consistency with Next.js `app/` directory, set `routesDirectory`:

```ts
// vite.config.ts
tanstackStart({
  router: {
    routesDirectory: 'app',  // Defaults to "routes", relative to srcDirectory
  },
})
```

### Steps

1. Remove Next.js: `npm uninstall next`
2. Install: `npm i @tanstack/react-router @tanstack/react-start`
3. Install: `npm i -D vite @vitejs/plugin-react @tailwindcss/vite tailwindcss vite-tsconfig-paths`
4. Create `vite.config.ts` with tanstackStart plugin
5. Create `src/router.tsx` with getRouter function
6. Convert `layout.tsx` → `__root.tsx`
7. Convert `page.tsx` files → route files with `createFileRoute`
8. Convert API routes → server routes or server functions
9. Run `npm run dev` to generate route tree

For rendering markdown (content-collections, dynamic fetching) and database integration (Neon, Convex, Prisma), see [Patterns](patterns.md).

## See Also

- [Routing & Components](api-routing.md) — createFileRoute, route hooks, components
- [Server Functions](api-server-functions.md) — createServerFn, validation, environment functions
- [Configuration](configuration.md) — Vite config setup for new projects
- [Deployment](deployment.md) — deployment options comparison
- [Patterns](patterns.md) — common usage patterns in TanStack Start
