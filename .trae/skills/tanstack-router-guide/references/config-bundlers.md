# Configuration: Bundler Setup

Bundler plugin setup, CLI configuration, plugin options, code splitting, and environment variables for TanStack Router.

---

## Bundler Plugin Setup

TanStack Router uses a bundler plugin (or standalone CLI) to generate the route tree from the file system. The plugin watches `src/routes/` and auto-generates `routeTree.gen.ts`.

Install the plugin package (required for all bundlers):

```sh
npm install -D @tanstack/router-plugin
```

### Bundler Comparison

| Feature | Vite | Webpack | Rspack/Rsbuild | Esbuild | Router CLI |
|---------|------|---------|----------------|---------|------------|
| Import path | `@tanstack/router-plugin/vite` | `@tanstack/router-plugin/webpack` | `@tanstack/router-plugin/rspack` | `@tanstack/router-plugin/esbuild` | `@tanstack/router-cli` |
| HMR support | Yes | Yes | Yes | Limited | No |
| Auto code splitting | Yes | Yes | Yes | Yes | No |
| Virtual file routes | Yes | Yes | Yes | Yes | Yes (via tsr.config.json) |
| Watch mode | Built-in | Built-in | Built-in | Built-in | Manual (`tsr watch`) |
| Recommended | Yes | -- | -- | -- | Fallback only |

### Vite (Recommended)

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    // CRITICAL: tanstackRouter() MUST come before react() in the plugins array.
    // Placing it after will cause route generation to fail silently or produce incorrect output.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
  ],
})
```

### Webpack

```ts
// webpack.config.ts
import { tanstackRouter } from '@tanstack/router-plugin/webpack'

export default {
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
  ],
  // ... other webpack config (module rules, entry, output, etc.)
}
```

### Rspack / Rsbuild

For **Rsbuild** (the recommended Rspack framework), add the plugin inside `tools.rspack.plugins`:

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/rspack'

export default defineConfig({
  plugins: [pluginReact()],
  tools: {
    rspack: {
      plugins: [
        tanstackRouter({
          target: 'react',
          autoCodeSplitting: true,
        }),
      ],
    },
  },
})
```

For **standalone Rspack** (no Rsbuild), add directly to `plugins`:

```ts
// rspack.config.ts
import { tanstackRouter } from '@tanstack/router-plugin/rspack'

export default {
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
  ],
}
```

### Esbuild

```ts
// esbuild.config.js
import { tanstackRouter } from '@tanstack/router-plugin/esbuild'

export default {
  // ... other esbuild config (entryPoints, bundle, outdir, etc.)
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
  ],
}
```

### Router CLI (Standalone, No Bundler Plugin)

Use the CLI when your bundler is not supported or for CI/CD pipelines. The CLI only generates the route tree file and does not provide HMR or code splitting.

Install separately:

```sh
npm install -D @tanstack/router-cli
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "generate-routes": "tsr generate",
    "watch-routes": "tsr watch",
    "build": "npm run generate-routes && <your-build-command>",
    "dev": "npm run watch-routes && <your-dev-command>"
  }
}
```

Available commands:

| Command | Description |
|---------|-------------|
| `tsr generate` | One-time route tree generation |
| `tsr watch` | Watch mode - continuously regenerates routes on file changes |

Configuration is read from `tsr.config.json` in the project root (same options as the bundler plugin).

### Manual Setup Without Plugin

For code-based routing (no file-based generation needed), no bundler plugin or CLI is required. Install only the core package:

```sh
npm install @tanstack/react-router
```

Then build your route tree manually in code using `createRootRoute`, `createRoute`, and `addChildren`. See the code-based route tree section in the routing configuration reference.

---

## Plugin/CLI Configuration Options

Configure via `tsr.config.json` in the project root (for CLI) or as the options object passed to the bundler plugin function. When both exist, plugin options take precedence over `tsr.config.json`.

### Default Configuration

```json
{
  "routesDirectory": "./src/routes",
  "generatedRouteTree": "./src/routeTree.gen.ts",
  "routeFileIgnorePrefix": "-",
  "quoteStyle": "single"
}
```

### All Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `target` | `'react'` | Required | Target framework. Currently only `'react'` is supported. |
| `routesDirectory` | `string` | `'./src/routes'` | Directory where route files live |
| `generatedRouteTree` | `string` | `'./src/routeTree.gen.ts'` | Output path for the generated route tree file |
| `quoteStyle` | `'single' \| 'double'` | `'single'` | Quote style used in generated code |
| `semicolons` | `boolean` | `true` | Whether to include semicolons in generated code |
| `autoCodeSplitting` | `boolean` | `false` | Automatically code-split route components, loaders, and other lazy-loadable exports |
| `disableTypes` | `boolean` | `false` | Disable TypeScript type generation (output plain JS) |
| `addExtensions` | `boolean` | `false` | Add file extensions to generated import paths (useful for ESM projects) |
| `disableLogging` | `boolean` | `false` | Suppress plugin console output during generation |
| `routeFilePrefix` | `string` | `''` | Only include files starting with this prefix as routes |
| `routeFileSuffix` | `string` | `''` | Only include files ending with this suffix as routes |
| `routeFileIgnorePrefix` | `string` | `'-'` | Files starting with this prefix are excluded from routing |
| `routeFileIgnorePattern` | `string` | `''` | Regex pattern for files to exclude from routing |
| `indexToken` | `string` | `'index'` | Token used to identify index routes in file names. Supports strings and regex patterns. |
| `routeToken` | `string` | `'route'` | Token used to identify route configuration files (e.g., `posts.route.tsx`). Supports strings and regex patterns. |
| `virtualRouteConfig` | `string \| VirtualRouteConfig` | `undefined` | Path to virtual routes file or inline virtual route configuration object. See Virtual File Routes in the routing configuration reference. |
| `experimental.enableCodeSplitting` | `boolean` | `false` | Enable experimental code splitting features |

Example with all common options:

```ts
// vite.config.ts
tanstackRouter({
  target: 'react',
  autoCodeSplitting: true,
  routesDirectory: './src/routes',
  generatedRouteTree: './src/routeTree.gen.ts',
  quoteStyle: 'single',
  semicolons: true,
  routeFileIgnorePrefix: '-',
  routeFileIgnorePattern: '.*\\.test\\.tsx?$',
  disableLogging: false,
})
```

### Automatic Code Splitting

When `autoCodeSplitting: true`, the plugin splits route files into separate chunks for each lazy-loadable property. Customize the grouping behavior:

```ts
tanstackRouter({
  target: 'react',
  autoCodeSplitting: true,
  codeSplittingOptions: {
    // Default: each property gets its own chunk
    defaultBehavior: [
      ['component'],
      ['errorComponent'],
      ['notFoundComponent'],
    ],
    // Per-route override by routeId
    splitBehavior: ({ routeId }) => {
      if (routeId.startsWith('/posts')) {
        return [['loader', 'component']] // Bundle loader+component together
      }
      // Return undefined to use defaultBehavior
    },
  },
})
```

Per-route override via the `codeSplitGroupings` route option:

```tsx
export const Route = createFileRoute('/posts')({
  codeSplitGroupings: [['loader', 'component']],
  loader: () => fetchPosts(),
  component: PostsPage,
})
```

CRITICAL: Do NOT export route properties (component, loader, etc.) from route files. Exporting prevents code splitting:

```tsx
// BAD - prevents code splitting
export function PostsComponent() { ... }

// GOOD - enables code splitting
function PostsComponent() { ... }
```

---

## Environment Variables

### Vite

Prefix with `VITE_` to expose to client code:

```sh
# .env
VITE_API_URL=https://api.example.com
VITE_PUBLIC_KEY=pk_123
# NEVER expose secrets (no VITE_ prefix):
DATABASE_URL=postgres://...
```

```tsx
// Access in routes/components
const apiUrl = import.meta.env.VITE_API_URL

// Type safety (src/vite-env.d.ts)
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_PUBLIC_KEY: string
}
```

### Runtime Validation

```tsx
import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_PUBLIC_KEY: z.string().min(1),
})

export const env = envSchema.parse(import.meta.env)
```

### Other Bundlers

- **Webpack**: Use `process.env.REACT_APP_*` or `DefinePlugin`
- **Rspack**: Use `PUBLIC_*` prefix with `builtins.define`
- **esbuild**: Use `define` option to inject env vars at build time

### Feature Flags in Routes

```tsx
export const Route = createFileRoute('/beta-feature')({
  beforeLoad: () => {
    if (!import.meta.env.VITE_ENABLE_BETA) {
      throw redirect({ to: '/' })
    }
  },
})
```

---

## Minimal Complete Example

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
  ],
})
```

```ts
// src/main.tsx
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadDelay: 50,
  defaultStaleTime: 30_000,
  defaultPendingMs: 200,
  defaultPendingMinMs: 300,
  scrollRestoration: true,
  defaultNotFoundComponent: () => <div>Page not found</div>,
  defaultErrorComponent: ({ error }) => <div>Error: {error.message}</div>,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

---

See also: `config-routing.md` (file naming conventions), `config-router-options.md` (createRouter options), `advanced-code-splitting.md` (code splitting details)
