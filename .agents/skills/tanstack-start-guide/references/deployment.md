# TanStack Start Deployment

TanStack Start deploys to any Vite-compatible host. Official partners: **Cloudflare**, **Netlify**, **Railway**.

## Cloudflare Workers

```bash
pnpm add -D @cloudflare/vite-plugin wrangler
```

```ts
// vite.config.ts
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
  ],
})
```

```jsonc
// wrangler.jsonc
{
  "name": "my-app",
  "compatibility_date": "2025-09-02",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry"
}
```

Add scripts: `"dev": "vite dev"`, `"build": "vite build"`, `"preview": "wrangler dev"`, `"deploy": "wrangler deploy"`.

```bash
npx wrangler login && pnpm run deploy
```

**Workers extensions:** Extend `server.ts` to handle queues, scheduled events, and Durable Objects.

## Netlify

```bash
npm i -D @netlify/vite-plugin-tanstack-start
```

```ts
// vite.config.ts
import netlify from '@netlify/vite-plugin-tanstack-start'

export default defineConfig({
  plugins: [tanstackStart(), netlify(), viteReact()],
})
```

```bash
npx netlify deploy
```

Provides full Netlify production platform emulation in local dev. Alternative: connect git repo for continuous deployment.

## Railway

Follow Nitro instructions, push to GitHub, connect at [railway.com](https://railway.com). Features: auto deployments on push, built-in databases (Postgres, MySQL, Redis, MongoDB), preview environments for PRs, automatic HTTPS and custom domains.

## Nitro (Universal Deployment)

```json
"nitro": "npm:nitro-nightly@latest"
```

```ts
import { nitro } from 'nitro/vite'

export default defineConfig({
  plugins: [tanstackStart(), nitro(), viteReact()],
})
```

**FastResponse optimization (Node.js + Nitro):**

```ts
// src/server.ts
import { FastResponse } from 'srvx'
globalThis.Response = FastResponse  // ~5% throughput improvement
```

## Vercel

Follow Nitro instructions. Deploy via Vercel's standard process.

## Node.js / Docker

Follow Nitro instructions. Build and run:

```bash
npm run build
node .output/server/index.mjs
```

## Bun

> Bun deployment guidelines currently require React 19. For React 18, use Node.js deployment.

```ts
// vite.config.ts
export default defineConfig({
  plugins: [tanstackStart(), nitro({ preset: 'bun' }), viteReact()],
})
```

```bash
bun run build && bun run server.ts
```

### Production Server with Bun

For optimal performance, use a custom server leveraging Bun's native APIs. Copy the [`server.ts`](https://github.com/tanstack/router/blob/main/examples/react/start-bun/server.ts) from the example repo, or build your own.

Features: native file handling, hybrid loading (preload small files, serve large on-demand), ETag support, Gzip compression, production caching headers.

**Environment Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `ASSET_PRELOAD_MAX_SIZE` | Max file size to preload (bytes) | `5242880` (5MB) |
| `ASSET_PRELOAD_INCLUDE_PATTERNS` | Glob patterns for files to include | All files |
| `ASSET_PRELOAD_EXCLUDE_PATTERNS` | Glob patterns for files to exclude | None |
| `ASSET_PRELOAD_VERBOSE_LOGGING` | Enable detailed logging | `false` |
| `ASSET_PRELOAD_ENABLE_ETAG` | Enable ETag generation | `true` |
| `ASSET_PRELOAD_ENABLE_GZIP` | Enable Gzip compression | `true` |
| `ASSET_PRELOAD_GZIP_MIN_SIZE` | Min file size for Gzip (bytes) | `1024` |

```bash
PORT=8080 ASSET_PRELOAD_VERBOSE_LOGGING=true bun run server.ts
```

## Appwrite Sites

1. Create app: `npm create @tanstack/start@latest`
2. Push to GitHub
3. Create Appwrite project at cloud.appwrite.io
4. Sites > Create site > Connect repository
5. Verify **TanStack Start** framework detected
6. Build settings: Install `npm install`, Build `npm run build`, Output `./dist` (or `./.output` for Nitro)
7. Add environment variables, Deploy

## See Also

- [Configuration](configuration.md) — Vite config, environment variables, server build config
- [Prerendering & Caching](prerendering-caching.md) — SSG, ISR, CDN cache headers
- [Observability](observability.md) — monitoring deployed applications
- [Migration & Comparison](migration.md) — framework comparison, Next.js migration
- [Troubleshooting](troubleshooting.md) — build & deploy issues
