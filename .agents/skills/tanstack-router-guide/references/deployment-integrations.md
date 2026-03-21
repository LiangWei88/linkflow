# Deployment & Integrations

Deployment, environment variables, and framework integrations for TanStack Router.

## Deployment

All SPA deployments need a catch-all redirect to `index.html` so client-side routing handles all URLs.

### Netlify

Option 1: Create `public/_redirects`:

```
/*    /index.html   200
```

Option 2: Create `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build]
  publish = "dist"
  command = "npm run build"
```

### Vercel

Create `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Cloudflare Pages

Create `public/_redirects`:

```
/*    /index.html   200
```

Also supports SPA mode by default. Deploy via Git or Wrangler CLI:

```bash
wrangler pages publish dist --project-name=my-app
```

### Firebase

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

### GitHub Pages

GitHub Pages does not support URL rewrites. Two workarounds:

1. Copy `index.html` to `404.html` after build: `cp dist/index.html dist/404.html`
2. Set base path in Vite config: `base: '/your-repo-name/'`
3. Alternatively, use `createHashHistory()` to avoid needing server rewrites

### Nginx

```nginx
server {
  listen 80;
  root /path/to/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

### Apache (.htaccess)

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Docker (Multi-Stage Build)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx tsr generate && npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

### Subdirectory Deployment

When deploying to a subpath (e.g., `example.com/app/`):

```ts
const router = createRouter({
  routeTree,
  basepath: '/app',
})
```

Also configure the bundler base path:

```ts
// vite.config.ts
export default defineConfig({
  base: '/app/',
})
```

### Fix 404 on Refresh

**Symptom**: Routes work when navigating within the app, but refreshing the page shows 404.

**Cause**: The server looks for files like `/about/index.html` which don't exist in SPAs.

**Solution**: Add the catch-all redirect configuration shown above for your hosting platform. The redirect serves `index.html` for all paths, allowing TanStack Router to handle routing on the client.

### Asset Caching Strategy

For production, configure long-lived caching for hashed static assets and short caching for `index.html`:

- `index.html`: `Cache-Control: no-cache` (always revalidate)
- JS/CSS with hash in filename: `Cache-Control: public, max-age=31536000, immutable`
- Images/fonts: `Cache-Control: public, max-age=31536000`

---

## Environment Variables

### Vite (Most Common)

Must use `VITE_` prefix. Accessed via `import.meta.env.VITE_*`:

```tsx
const apiUrl = import.meta.env.VITE_API_URL       // Works
const secret = import.meta.env.SECRET_KEY          // Undefined (no prefix)
const isDev = import.meta.env.DEV                  // Built-in boolean
```

Variables are replaced at **bundle time**, not runtime. Restart the dev server after `.env` changes.

### Webpack

Use `DefinePlugin` to inject variables. Access via `process.env.*`:

```ts
// webpack.config.js
new webpack.DefinePlugin({
  'process.env.API_URL': JSON.stringify(process.env.API_URL),
})
```

### Rspack

Uses `PUBLIC_` prefix convention:

```tsx
const apiUrl = import.meta.env.PUBLIC_API_URL
```

### Esbuild

Configure via `define` option:

```ts
await build({
  define: {
    'process.env.API_URL': `"${process.env.API_URL}"`,
  },
})
```

### Runtime Validation with Zod

Validate environment variables at startup to catch missing values early:

```tsx
import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_ENABLE_ANALYTICS: z.string().default('false'),
})

export const env = envSchema.parse(import.meta.env)
```

### Feature Flags in Routes

```tsx
const features = {
  enableNewDashboard: import.meta.env.VITE_ENABLE_NEW_DASHBOARD === 'true',
}

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: () => {
    if (!features.enableNewDashboard) {
      throw redirect({ to: '/dashboard/legacy' })
    }
  },
})
```

### Security Rules

- **Never** put secrets (API secret keys, database passwords) in client environment variables -- they are visible in the browser
- Only prefixed variables (`VITE_`, `PUBLIC_`) are exposed to the client
- Use server-side proxies for sensitive API calls
- Audit built files for accidentally leaked secrets

### Type Safety for Env Vars

Create `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ENABLE_ANALYTICS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

## Framework Integrations

### shadcn/ui

**Link integration**: Use `createLink` to wrap shadcn Button as a router link:

```tsx
import { createLink } from '@tanstack/react-router'
import { Button, type ButtonProps } from '@/components/ui/button'
import { forwardRef } from 'react'

export const RouterButton = createLink(
  forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
    <Button ref={ref} {...props} />
  )),
)
```

**Navigation menu**: Use TanStack Router's `Link` directly in `NavigationMenuList`. Use `useMatchRoute` for active state detection:

```tsx
const matchRoute = useMatchRoute()
const isActive = matchRoute({ to: item.to, fuzzy: true })
```

**Animation issues with Sheet/Dialog**: Use controlled components (`open` + `onOpenChange` props) for reliable animations with route transitions.

**Quick setup**: `npx create-tsrouter-app@latest my-app --template file-router --tailwind --add-ons shadcn`

### Chakra UI

Wrap `ChakraProvider` at the root route level, not inside individual routes:

```tsx
export const Route = createRootRoute({
  component: () => (
    <ChakraProvider theme={theme}>
      <Outlet />
    </ChakraProvider>
  ),
})
```

Create router-compatible components with `createLink` and `forwardRef`:

```tsx
import { createLink } from '@tanstack/react-router'
import { Link as ChakraLink } from '@chakra-ui/react'
import { forwardRef } from 'react'

export const RouterLink = createLink(
  forwardRef<HTMLAnchorElement, any>((props, ref) => (
    <ChakraLink ref={ref} {...props} />
  )),
)
```

**Color mode persistence**: Add `<ColorModeScript>` to `index.html` head and use `localStorageManager` in `ChakraProvider`.

### Material UI (MUI)

Same pattern -- wrap `ThemeProvider` at root level and use `createLink` for components:

```tsx
import { createLink } from '@tanstack/react-router'
import Button, { type ButtonProps } from '@mui/material/Button'
import { forwardRef } from 'react'

export const RouterButton = createLink(
  forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
    <Button ref={ref} component="button" {...props} />
  )),
)
```

**Style conflicts**: Use Emotion cache with `prepend: true` to ensure MUI styles load before other styles:

```tsx
import createCache from '@emotion/cache'
const cache = createCache({ key: 'mui', prepend: true })
```

**Tree shaking**: Import from specific paths (`import Button from '@mui/material/Button'`) rather than barrel imports.

### Framer Motion

**Route transitions**: Wrap `<Outlet />` in `<AnimatePresence>` with the route pathname as key:

```tsx
import { AnimatePresence } from 'framer-motion'
import { useRouter } from '@tanstack/react-router'

export function RouteAnimationContainer({ children }) {
  const router = useRouter()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={router.state.location.pathname}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

**Page transition variants**:

```tsx
const variants = {
  fade: { initial: { opacity: 0 }, in: { opacity: 1 }, out: { opacity: 0 } },
  slide: { initial: { opacity: 0, x: -20 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: 20 } },
  slideUp: { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } },
}
```

**Shared element transitions**: Use `layoutId` on `motion.div` to animate elements between routes (e.g., a card expanding into a detail page).

**Loading animation**: Use `pendingComponent` on routes with a Framer Motion loading animation.

**Accessibility**: Respect `prefers-reduced-motion` -- disable or simplify animations when the user has requested reduced motion.

---

See also: `config-bundlers.md` (build configuration), `troubleshooting.md` (common deployment errors), `testing-migration.md` (testing and migration guides)
