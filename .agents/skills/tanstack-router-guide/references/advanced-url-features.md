# Advanced: URL Features

URL rewrites, route masking, and custom search serialization.

---

## URL Rewrites

Transform URLs bidirectionally between what the browser displays and what the router matches internally. This enables locale prefixes, subdomain routing, legacy URL migration, and multi-tenant patterns without duplicating routes.

### Conceptual Framework

```
Browser URL (/en/about)
    |
    v  input rewrite (strip locale)
Internal URL (/about)
    |  (matches routes, runs loaders)
    v  output rewrite (add locale)
Browser URL (/en/about)
```

### `location.href` vs `location.publicHref`

- `location.href` -- Internal URL after input rewrite (used for routing).
- `location.publicHref` -- External URL after output rewrite (displayed in browser). Use for canonical URLs, sharing links, analytics.

```tsx
function ShareButton() {
  const location = useLocation()
  // Internal: location.href = "/about"
  // External: location.publicHref = "/en/about"
  return <a href={window.location.origin + location.publicHref}>Share</a>
}
```

### Basic Usage

```tsx
const router = createRouter({
  routeTree,
  rewrite: {
    input: ({ url }) => {
      // Transform browser URL -> router internal URL
      return url  // Return mutated url, new URL, string, or undefined to skip
    },
    output: ({ url }) => {
      // Transform router internal URL -> browser URL
      return url
    },
  },
})
```

### i18n Locale Prefix

```tsx
const locales = ['en', 'fr', 'es', 'de']
const defaultLocale = 'en'

const router = createRouter({
  routeTree,
  rewrite: {
    input: ({ url }) => {
      const segments = url.pathname.split('/').filter(Boolean)
      if (locales.includes(segments[0])) {
        url.pathname = '/' + segments.slice(1).join('/') || '/'
      }
      return url
    },
    output: ({ url }) => {
      const locale = getLocale()
      if (locale !== defaultLocale) {
        url.pathname = `/${locale}${url.pathname === '/' ? '' : url.pathname}`
      }
      return url
    },
  },
})
```

### Legacy URL Migration

```tsx
const legacyPaths: Record<string, string> = {
  '/old-about': '/about',
  '/old-blog': '/blog',
}

const router = createRouter({
  routeTree,
  rewrite: {
    input: ({ url }) => {
      const newPath = legacyPaths[url.pathname]
      if (newPath) url.pathname = newPath
      return url
    },
    // No output rewrite needed -- new URLs used going forward
  },
})
```

### Multi-Tenant Routing

```tsx
rewrite: {
  input: ({ url }) => {
    const parts = url.hostname.split('.')
    if (parts.length >= 3) {
      url.pathname = `/tenant/${parts[0]}${url.pathname}`
    }
    return url
  },
  output: ({ url }) => {
    const match = url.pathname.match(/^\/tenant\/([^/]+)(.*)$/)
    if (match) {
      url.hostname = `${match[1]}.app.com`
      url.pathname = match[2] || '/'
    }
    return url
  },
}
```

### Search Parameter Transformation

```tsx
rewrite: {
  input: ({ url }) => {
    const filterStatus = url.searchParams.get('filter_status')
    if (filterStatus) {
      url.searchParams.delete('filter_status')
      url.searchParams.set('status', filterStatus)
    }
    return url
  },
}
```

### `composeRewrites()`

Combine multiple independent rewrite rules:

```tsx
import { composeRewrites } from '@tanstack/react-router'

const router = createRouter({
  routeTree,
  rewrite: composeRewrites([localeRewrite, legacyRewrite]),
})
```

**Execution order:**
- Input rewrites: first to last
- Output rewrites: last to first (reverse order)

This ensures composed rewrites "unwrap" correctly.

### Interaction with `basepath`

When both `basepath` and `rewrite` are configured, they are automatically composed:

- **Input**: Basepath stripped first, then your rewrite runs
- **Output**: Your rewrite runs first, then basepath is added back

### Hard Links for Cross-Origin Rewrites

When an output rewrite changes the origin (hostname), `<Link>` automatically renders a standard `<a>` tag with a full page navigation instead of client-side routing.

### Server-Side Considerations

Rewrites apply on both client and server. The server handler uses the same rewrite configuration for parsing incoming URLs and generating responses. The `publicHref` is serialized during SSR for consistent client hydration.

---

## Route Masking

Show a different URL in the browser than the actual matched route. Useful for modal patterns where you navigate to `/photos/$photoId/modal` but display `/photos/$photoId` in the URL bar.

### How It Works Internally

Route masking uses `location.state.__tempLocation` to store the actual runtime location inside the displayed location. When the router encounters a location with `__tempLocation`, it uses that instead of the parsed URL. The original display URL is saved in `location.maskedLocation` for reference (used by DevTools).

### Imperative Masking

```tsx
<Link
  to="/photos/$photoId/modal"
  params={{ photoId: '5' }}
  mask={{ to: '/photos/$photoId', params: { photoId: '5' } }}
>
  Open Photo
</Link>

navigate({
  to: '/photos/$photoId/modal',
  params: { photoId: '5' },
  mask: { to: '/photos/$photoId', params: { photoId: '5' } },
})
```

The `mask` option accepts the same navigation options as `<Link>` and `navigate()` (`to`, `params`, `search`, `replace`, etc.) and is fully type-safe.

### Declarative Masking (Router-Level)

Apply masks automatically without passing `mask` to every link:

```tsx
import { createRouteMask } from '@tanstack/react-router'

const photoModalMask = createRouteMask({
  routeTree,
  from: '/photos/$photoId/modal',
  to: '/photos/$photoId',
  params: (prev) => ({ photoId: prev.photoId }),
})

const router = createRouter({
  routeTree,
  routeMasks: [photoModalMask],
})
```

### `unmaskOnReload` Option

By default, masked URLs remain masked on page reload (masking data persists in `location.state`). URLs are always unmasked when shared (copied/pasted) since the masking data is lost.

To unmask on reload, set `unmaskOnReload: true` at any level (each overrides the previous in priority):

1. Router default: `createRouter({ unmaskOnReload: true })`
2. Route mask: `createRouteMask({ unmaskOnReload: true, ... })`
3. Per-link/navigation: `<Link mask={{ ... }} unmaskOnReload={true}>`

### DevTools Detection

DevTools detect masked routes and display the actual URL via `location.maskedLocation`.

---

## Custom Search Param Serialization

Replace the default `JSON.stringify`/`JSON.parse` serialization with custom formats using `parseSearchWith` and `stringifySearchWith`.

### Idempotency Principle

Serialization and deserialization must be idempotent -- you must get the same object back after a round-trip. Libraries that do not support nested objects will lose data.

### Base64 Encoding

```tsx
const router = createRouter({
  parseSearch: parseSearchWith((v) => JSON.parse(decodeFromBinary(v))),
  stringifySearch: stringifySearchWith((v) =>
    encodeToBinary(JSON.stringify(v)),
  ),
})

function decodeFromBinary(str: string): string {
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(str), function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      })
      .join(''),
  )
}

function encodeToBinary(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode(parseInt(p1, 16))
    }),
  )
}
```

Use the safe `encodeToBinary`/`decodeFromBinary` functions instead of raw `atob`/`btoa` since the browser versions do not handle non-UTF8 characters correctly.

### `query-string` Library

```tsx
import qs from 'query-string'

const router = createRouter({
  stringifySearch: stringifySearchWith((v) => qs.stringify(v)),
  parseSearch: parseSearchWith((v) => qs.parse(v)),
})
```

### JSURL2 Compression

Compresses URLs while maintaining readability:

```tsx
import { parse, stringify } from 'jsurl2'

const router = createRouter({
  parseSearch: parseSearchWith(parse),
  stringifySearch: stringifySearchWith(stringify),
})
```

### Zipson Library

High-performance JSON compression (requires base64 encoding):

```tsx
import { stringify, parse } from 'zipson'

const router = createRouter({
  parseSearch: parseSearchWith((v) => parse(decodeFromBinary(v))),
  stringifySearch: stringifySearchWith((v) =>
    encodeToBinary(stringify(v)),
  ),
})
```

---

See also: `config-router-options.md` (routeMasks, rewrite, trailingSlash), `patterns-params.md` (custom search serialization)
