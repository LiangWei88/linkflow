# TanStack Start Configuration

## Vite Configuration

### Basic Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    viteReact(), // MUST come after tanstackStart()
  ],
})
```

### tanstackStart Plugin Options

```ts
tanstackStart({
  // Source directory (default: 'src')
  srcDirectory: 'src',

  // Router options
  router: {
    routesDirectory: 'routes',  // Relative to srcDirectory
  },

  // Prerendering
  prerender: {
    enabled: true,
    autoSubfolderIndex: true,         // /page/index.html instead of /page.html
    autoStaticPathsDiscovery: true,
    concurrency: 14,
    crawlLinks: true,                 // Discover pages from links in rendered HTML
    filter: ({ path }) => !path.startsWith('/admin'),
    retryCount: 2,                    // Retry failed prerenders
    retryDelay: 1000,                 // Delay between retries (ms)
    maxRedirects: 5,                  // Max redirects to follow
    failOnError: true,                // Fail build on prerender error
    onSuccess: ({ page }) => {        // Callback on successful page render
      console.log(`Prerendered: ${page}`)
    },
  },

  // Sitemap generation
  sitemap: {
    enabled: true,
    host: 'https://myapp.com',
  },

  // SPA mode
  spa: {
    enabled: false,
    maskPath: '/',                    // Shell mask path (default: '/')
    prerender: {
      outputPath: '/_shell.html',    // Default shell output path
      crawlLinks: false,             // Default: disabled in SPA
      retryCount: 0,                 // Default: no retries in SPA
    },
  },

  // Server configuration
  server: {
    build: {
      staticNodeEnv: true,  // Replace process.env.NODE_ENV at build time
    },
  },

  // Server function customization
  serverFns: {
    generateFunctionId: ({ filename, functionName }) => {
      return crypto.createHash('sha1').update(`${filename}--${functionName}`).digest('hex')
    },
  },

  // Pages (merged with auto-discovered static routes)
  pages: [
    { path: '/custom', prerender: { enabled: true, outputPath: '/custom/index.html' } },
  ],
})
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022",
    "skipLibCheck": true,
    "strictNullChecks": true,
    "baseUrl": ".",
    "paths": { "~/*": ["./src/*"] }
  }
}
```

**Do NOT enable `verbatimModuleSyntax`** — it causes server bundles to leak into client bundles.

## Environment Variables

### Quick Start

```bash
# .env
DATABASE_URL=postgresql://localhost:5432/mydb   # Server-only
VITE_APP_NAME=MyApp                             # Available on client
```

```tsx
// Server function — access any env var
const getData = createServerFn().handler(async () => {
  const db = connectTo(process.env.DATABASE_URL)
  return db.query('SELECT ...')
})

// Client component — only VITE_ prefixed
function App() {
  return <h1>{import.meta.env.VITE_APP_NAME}</h1>
}
```

### File Hierarchy (loaded in order)

```
.env.local          # Local overrides (gitignored)
.env.production     # Production-specific
.env.development    # Development-specific
.env                # Defaults (committed)
```

### Access Patterns

| Context | Access Method | Prefix Required |
|---------|--------------|-----------------|
| Server (server functions, server routes) | `process.env.VAR_NAME` | None |
| Client (components, client code) | `import.meta.env.VITE_VAR_NAME` | `VITE_` |

### Type Safety

```ts
// src/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly DATABASE_URL: string
      readonly SESSION_SECRET: string
    }
  }
}

export {}
```

### Runtime Validation with Zod

```ts
import { z } from 'zod'

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
})

export const serverEnv = serverEnvSchema.parse(process.env)
```

### Runtime Client Environment Variables

Pass server env vars to client at runtime (not baked at build time):

```tsx
const getRuntimeVar = createServerFn({ method: 'GET' }).handler(() => {
  return process.env.MY_RUNTIME_VAR
})

export const Route = createFileRoute('/')({
  loader: async () => ({ config: await getRuntimeVar() }),
  component: () => {
    const { config } = Route.useLoaderData()
    return <div>{config}</div>
  },
})
```

### Common Patterns

**Database configuration:**

```ts
// .env
DATABASE_URL=postgresql://localhost:5432/mydb
DATABASE_MAX_CONNECTIONS=10
DATABASE_SSL=false

// Server function
const db = createPool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
  ssl: process.env.DATABASE_SSL === 'true',
})
```

**Feature flags:**

```tsx
// .env
VITE_ENABLE_NEW_DASHBOARD=true

// Client component
function Navigation() {
  if (import.meta.env.VITE_ENABLE_NEW_DASHBOARD === 'true') {
    return <NewDashboard />
  }
  return <LegacyDashboard />
}
```

### Security Best Practices

1. **Never expose secrets** — Do NOT use `VITE_` prefix on secrets:

```tsx
// WRONG — exposed to client bundle
VITE_SECRET_API_KEY=sk-12345

// CORRECT — server-only via createServerFn
const callApi = createServerFn().handler(async () => {
  return fetch(url, { headers: { Authorization: process.env.SECRET_API_KEY } })
})
```

2. **Validate required variables at startup:**

```ts
const requiredServerEnv = ['DATABASE_URL', 'SESSION_SECRET']
for (const key of requiredServerEnv) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`)
}
```

## Path Aliases

1. Configure `tsconfig.json`:

```json
{ "compilerOptions": { "baseUrl": ".", "paths": { "~/*": ["./src/*"] } } }
```

2. Install and configure vite plugin:

```bash
npm i -D vite-tsconfig-paths
```

```ts
// vite.config.ts
import tsConfigPaths from 'vite-tsconfig-paths'
// Add tsConfigPaths({ projects: ['./tsconfig.json'] }) to plugins array
```

3. Usage:

```ts
import { Input } from '~/components/ui/input'  // instead of '../../../components/ui/input'
```

## Tailwind CSS Integration

### Tailwind v4 (Recommended)

```bash
npm install tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
// Add tailwindcss() to plugins array
```

```css
/* src/styles/app.css */
@import 'tailwindcss' source('../');
```

```tsx
// src/routes/__root.tsx
/// <reference types="vite/client" />
import appCss from '../styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'stylesheet', href: appCss }],
    // ...
  }),
})
```

### Tailwind v3 (Legacy)

```bash
npm i -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

```js
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
}
```

```css
/* src/styles/app.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Server Build Configuration

### Static NODE_ENV Replacement

By default, TanStack Start statically replaces `process.env.NODE_ENV` in server builds at build time. This enables dead code elimination (tree-shaking) for development-only code paths.

```ts
tanstackStart({
  server: {
    build: {
      staticNodeEnv: true,  // Default: true
    },
  },
})
```

**Why this matters:** Vite auto-replaces `process.env.NODE_ENV` in client builds, but server builds run in Node.js where `process.env` is a real runtime object. Without static replacement, dev-only code remains in production bundles.

**Replacement value order:**
1. `process.env.NODE_ENV` at build time (if set)
2. Vite's `mode` (e.g., from `--mode staging`)
3. `"production"` (fallback)

**When to disable (`staticNodeEnv: false`):**
- Same build deployed to multiple environments (staging + production)
- Runtime environment detection needed
- Testing production builds locally with `NODE_ENV=development`

**Important:** If disabled, you MUST set `NODE_ENV=production` at runtime in production. Without this, React runs in development mode (significantly slower).

## Project Structure

```
.
├── src/
│   ├── routes/
│   │   ├── __root.tsx          # Root route (HTML shell)
│   │   ├── index.tsx           # Home page (/)
│   │   ├── about.tsx           # /about
│   │   ├── posts.tsx           # /posts layout
│   │   ├── posts/
│   │   │   ├── index.tsx       # /posts (index)
│   │   │   └── $postId.tsx     # /posts/:postId
│   │   ├── _authed.tsx         # Pathless layout (auth wrapper)
│   │   ├── _authed/
│   │   │   └── dashboard.tsx   # /dashboard (protected)
│   │   └── api/
│   │       └── hello.ts        # /api/hello (server route)
│   ├── utils/
│   │   ├── users.functions.ts  # Server function wrappers
│   │   ├── users.server.ts     # Server-only helpers
│   │   └── schemas.ts          # Shared validation schemas
│   ├── router.tsx              # Router configuration
│   ├── start.ts                # Global middleware (optional)
│   ├── server.ts               # Server entry (optional)
│   ├── client.tsx              # Client entry (optional)
│   └── routeTree.gen.ts        # Auto-generated route tree
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## See Also

- [Routing & Components](api-routing.md) — createFileRoute, route hooks, components
- [Middleware](api-middleware.md) — createStart, tanstackStart plugin usage
- [Server & Client Entry](server-entry.md) — custom server/client entry points
- [Deployment](deployment.md) — hosting-specific configuration
- [Prerendering & Caching](prerendering-caching.md) — prerender, spa, sitemap config options
- [Troubleshooting](troubleshooting.md) — build issues, verbatimModuleSyntax, plugin order
