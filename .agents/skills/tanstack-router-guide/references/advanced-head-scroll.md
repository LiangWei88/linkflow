# Advanced: Document Head & Scroll

Document head management and scroll restoration.

---

## Document Head Management

Manage `<title>`, `<meta>`, `<link>`, `<style>`, and `<script>` tags per route. Tags are automatically loaded/unloaded based on route visibility.

### Route-Level Head

```tsx
export const Route = createFileRoute('/posts/$postId')({
  head: ({ loaderData }) => ({
    title: loaderData.post.title,
    meta: [{ name: 'description', content: loaderData.post.excerpt }],
    links: [
      { rel: 'canonical', href: `https://example.com/posts/${loaderData.post.id}` },
    ],
    styles: [
      { media: 'print', children: 'body { font-size: 12pt; }' },
    ],
    scripts: [
      { src: 'https://www.google-analytics.com/analytics.js' },
    ],
  }),
})
```

### Deduping

Tags are deduped automatically. The **last occurrence wins** in nested routes:

- `title` tags in child routes override parent route titles.
- `meta` tags with the same `name` or `property` are overridden by the deepest route.

### `<HeadContent />`

Required to render head-related tags. Placement depends on application type:

```tsx
// SSR / Full-stack: inside <head>
<html>
  <head>
    <HeadContent />
  </head>
  <body>
    <Outlet />
  </body>
</html>

// SPA: anywhere in the component tree (uses document.head internally)
<>
  <HeadContent />
  <Outlet />
</>
```

### `<Scripts />`

Renders body scripts defined via `routeOptions.scripts`. Place in the `<body>` tag, after `<Outlet />`:

```tsx
export const Route = createRootRoute({
  scripts: () => [
    { children: 'console.log("Hello, world!")' },
  ],
  component: () => (
    <html>
      <head><HeadContent /></head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
})
```

### `<ScriptOnce>` for Pre-Hydration Scripts

Runs inline JavaScript before React hydrates. The script executes once during SSR, then removes itself from the DOM. On client-side navigation, nothing is rendered (prevents duplicate execution).

```tsx
import { ScriptOnce } from '@tanstack/react-router'

<ScriptOnce
  children={`(function() {
    try {
      var theme = localStorage.getItem('theme') || 'auto';
      var resolved = theme === 'auto'
        ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      document.documentElement.classList.add(resolved);
    } catch (e) {}
  })();`}
/>
```

### Preventing FOUC (Flash of Unstyled Content)

Use `ScriptOnce` to apply theme classes before hydration. Add `suppressHydrationWarning` to elements modified by the script:

```tsx
export const Route = createRootRoute({
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ScriptOnce children={themeDetectionScript} />
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
})
```

Common `ScriptOnce` use cases: theme/dark mode detection, feature detection, analytics initialization, critical path setup.

---

## Scroll Restoration

### Hash and Top-of-Page Scrolling

Hash scrolling and scroll-to-top work out of the box with no configuration.

### Enabling Scroll Restoration

```tsx
const router = createRouter({
  scrollRestoration: true,
})
```

### `scrollToTopSelectors` for Nested Scrollable Areas

By default, only `window` is scrolled to top. For nested scrollable containers:

```tsx
const router = createRouter({
  scrollToTopSelectors: ['#main-content'],
})
```

For complex selectors (e.g., inside shadow DOM):

```tsx
const selector = () =>
  document.querySelector('#shadowRootParent')?.shadowRoot?.querySelector('#main-scrollable-area')

const router = createRouter({
  scrollToTopSelectors: [selector],
})
```

These selectors are handled **in addition to `window`**.

### `getScrollRestorationKey` for Custom Cache Keys

Control how scroll positions are cached. Default uses the history entry key.

```tsx
const router = createRouter({
  getScrollRestorationKey: (location) => location.pathname,
})

// Conditional: sync some paths, use key for rest
const router = createRouter({
  getScrollRestorationKey: (location) => {
    const paths = ['/', '/chat']
    return paths.includes(location.pathname)
      ? location.pathname
      : location.state.__TSR_key!
  },
})
```

### `resetScroll` Option

Prevent scroll restoration/reset for specific navigations:

```tsx
<Link to="/tab" resetScroll={false}>Tab</Link>

navigate({ to: '/tab', resetScroll: false })

redirect({ to: '/tab', resetScroll: false })
```

### `scrollRestorationBehavior`

Control the scroll transition animation. Options: `smooth`, `instant`, `auto`.

```tsx
const router = createRouter({
  scrollRestorationBehavior: 'instant',
})
```

### `useElementScrollRestoration` for Virtualized Lists

For window-level virtualized content:

```tsx
function VirtualizedPage() {
  const scrollEntry = useElementScrollRestoration({
    getElement: () => window,
  })

  const virtualizer = useWindowVirtualizer({
    count: 10000,
    estimateSize: () => 100,
    initialOffset: scrollEntry?.scrollY,
  })

  return <div>{virtualizer.getVirtualItems().map((item) => /* ... */)}</div>
}
```

For element-level virtualized content with `data-scroll-restoration-id`:

```tsx
function VirtualizedList() {
  const scrollRestorationId = 'myVirtualizedContent'
  const scrollEntry = useElementScrollRestoration({ id: scrollRestorationId })
  const parentRef = React.useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: 10000,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    initialOffset: scrollEntry?.scrollY,
  })

  return (
    <div
      ref={parentRef}
      data-scroll-restoration-id={scrollRestorationId}
      className="overflow-auto"
    >
      {/* virtualized content */}
    </div>
  )
}
```

---

## Internationalization (i18n)

### Optional Path Parameter Pattern

Use `{-$locale}` syntax for optional locale segments in file-based routes:

```tsx
// src/routes/{-$locale}/about.tsx
// Matches: /about, /en/about, /fr/about
export const Route = createFileRoute('/{-$locale}/about')({
  component: () => {
    const { locale } = Route.useParams()
    const currentLocale = locale || 'en'
    return <h1>{t('about.title', currentLocale)}</h1>
  },
})
```

### Complex Routing with Categories and Slugs

```tsx
// Route: /{-$locale}/blog/{-$category}/$slug
export const Route = createFileRoute('/{-$locale}/blog/{-$category}/$slug')({
  beforeLoad: ({ params }) => {
    const locale = params.locale || 'en'
    const validLocales = ['en', 'fr', 'es', 'de']
    if (params.locale && !validLocales.includes(params.locale)) {
      throw new Error('Invalid locale')
    }
    return { locale }
  },
})
```

### Language Switching

Use function-style params to preserve other parameters while changing locale:

```tsx
<Link
  to="/{-$locale}/blog/{-$category}/$slug"
  params={(prev) => ({
    ...prev,
    locale: prev.locale === 'en' ? undefined : 'fr',
  })}
>
  Francais
</Link>
```

### Type-Safe Locales

```ts
type Locale = 'en' | 'fr' | 'es' | 'de'

function isLocale(value?: string): value is Locale {
  return ['en', 'fr', 'es', 'de'].includes(value as Locale)
}
```

### SEO Canonical URLs

Use `location.publicHref` for canonical URLs and `head()` for locale-specific meta tags:

```tsx
export const Route = createFileRoute('/{-$locale}/about')({
  head: () => ({
    links: [
      { rel: 'canonical', href: `https://example.com${location.publicHref}` },
    ],
  }),
})
```

### Paraglide Integration

Paraglide provides type-safe translations with URL localization that pairs naturally with rewrites:

```ts
import { deLocalizeUrl, localizeUrl } from './paraglide/runtime'

const router = createRouter({
  routeTree,
  rewrite: {
    input: ({ url }) => deLocalizeUrl(url),
    output: ({ url }) => localizeUrl(url),
  },
})
```

For SSR with TanStack Start, add server middleware:

```ts
import { paraglideMiddleware } from './paraglide/server'

export default {
  fetch(req: Request) {
    return paraglideMiddleware(req, () => handler.fetch(req))
  },
}
```

Set the HTML language attribute:

```tsx
import { getLocale } from '../paraglide/runtime'
<html lang={getLocale()} />
```

### Additional i18n Libraries

- **Intlayer**: TanStack Start integration at [intlayer.org/doc/environment/tanstack-start](https://intlayer.org/doc/environment/tanstack-start)
- **use-intl**: TanStack Start integration guide at [nikuscs.com/blog/13-tanstackstart-i18n/](https://nikuscs.com/blog/13-tanstackstart-i18n/)

---

See also: `advanced-ssr.md` (SSR head management), `config-router-options.md` (scroll restoration options)
