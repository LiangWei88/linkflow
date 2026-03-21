# Patterns: Path & Search Parameters

Path parameter and search parameter patterns for TanStack Router. All examples use file-based routing with TypeScript.

---

## Path Parameters

### Basic Path Params

Define dynamic segments with `$` prefix. The param matches a single segment (text until the next `/`).

```tsx
// src/routes/posts.$postId.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    return fetchPost(params.postId)
  },
  component: PostComponent,
})

function PostComponent() {
  const { postId } = Route.useParams()
  return <div>Post {postId}</div>
}
```

Path params are available in `beforeLoad`, `loader`, and components. Child routes inherit parent params automatically.

### Optional Path Parameters

Use `{-$paramName}` syntax for segments that may or may not be present. The value is `undefined` when absent.

```tsx
// src/routes/posts/{-$category}.tsx
export const Route = createFileRoute('/posts/{-$category}')({
  loader: async ({ params }) => {
    // params.category might be undefined
    return fetchPosts({ category: params.category })
  },
  component: PostsComponent,
})

function PostsComponent() {
  const { category } = Route.useParams()
  return <div>{category ? `Posts in ${category}` : 'All Posts'}</div>
}
```

Matches:
- `/posts/{-$category}` matches both `/posts` and `/posts/tech`
- `/posts/{-$category}/{-$slug}` matches `/posts`, `/posts/tech`, and `/posts/tech/hello-world`
- `/users/$id/{-$tab}` matches `/users/123` and `/users/123/settings`

### Prefix and Suffix Patterns

Wrap the param in curly braces `{}` to add static text before or after the dynamic segment.

```tsx
// Prefix: src/routes/posts/post-{$postId}.tsx
export const Route = createFileRoute('/posts/post-{$postId}')({
  component: () => {
    const { postId } = Route.useParams()
    return <div>Post ID: {postId}</div>
  },
})

// Suffix: src/routes/files/{$fileName}.txt.tsx
export const Route = createFileRoute('/files/{$fileName}.txt')({
  component: () => {
    const { fileName } = Route.useParams()
    return <div>File: {fileName}</div>
  },
})

// Combined: src/routes/users/user-{$userId}.json.tsx
export const Route = createFileRoute('/users/user-{$userId}.json')({
  component: () => {
    const { userId } = Route.useParams()
    return <div>User ID: {userId}</div>
  },
})
```

### Navigating with Path Params

TypeScript requires params as an object or a function returning an object.

```tsx
// Object style
<Link to="/blog/$postId" params={{ postId: '123' }}>Post 123</Link>

// Function style (useful for preserving other params)
<Link to="/blog/$postId" params={(prev) => ({ ...prev, postId: '123' })}>
  Post 123
</Link>

// Optional params
<Link to="/posts/{-$category}" params={{ category: 'tech' }}>Tech Posts</Link>
<Link to="/posts/{-$category}" params={{ category: undefined }}>All Posts</Link>
```

### Accessing Params Outside Routes

Use the global `useParams` hook with `strict: false` for ambiguous locations.

```tsx
function PostComponent() {
  const { postId } = useParams({ strict: false })
  return <div>Post {postId}</div>
}
```

### Allowed Characters

By default, path params are escaped with `encodeURIComponent`. Allow specific characters via router config.

```tsx
const router = createRouter({
  routeTree,
  pathParamsAllowedCharacters: ['@', '+'],
})
```

Supported: `;`, `:`, `@`, `&`, `=`, `+`, `$`, `,`

### i18n with Optional Parameters

Use optional locale prefix for internationalized routes.

```tsx
// src/routes/{-$locale}/about.tsx
export const Route = createFileRoute('/{-$locale}/about')({
  component: () => {
    const { locale } = Route.useParams()
    const currentLocale = locale || 'en'
    return <h1>{content[currentLocale]?.title}</h1>
  },
})
// Matches: /about, /en/about, /fr/about
```

---

## Search Parameters

### Basic Validation with Zod Adapter

Use `zodValidator` from `@tanstack/zod-adapter` with `fallback` for type-safe input/output inference. The `fallback` function retains types while providing a fallback when validation fails. Use `.default()` to make params optional during navigation.

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { zodValidator, fallback } from '@tanstack/zod-adapter'
import { z } from 'zod'

const productSearchSchema = z.object({
  page: fallback(z.number(), 1).default(1),
  filter: fallback(z.string(), '').default(''),
  sort: fallback(z.enum(['newest', 'oldest', 'price']), 'newest').default('newest'),
})

export const Route = createFileRoute('/shop/products/')({
  validateSearch: zodValidator(productSearchSchema),
})
```

Key: With `zodValidator`, `<Link to="/shop/products" />` works without passing `search` because `.default()` makes all params optional for navigation.

Without the adapter, using `.catch()` loses type info (makes types `unknown`). Without `.default()`, TypeScript requires `search` on every navigation.

### Validation with Valibot (No Adapter Needed)

Valibot implements Standard Schema, so pass the schema directly -- no adapter import required.

```tsx
import * as v from 'valibot'

const productSearchSchema = v.object({
  page: v.optional(v.fallback(v.number(), 1), 1),
  filter: v.optional(v.fallback(v.string(), ''), ''),
  sort: v.optional(
    v.fallback(v.picklist(['newest', 'oldest', 'price']), 'newest'),
    'newest',
  ),
})

export const Route = createFileRoute('/shop/products/')({
  validateSearch: productSearchSchema,
})
```

### Validation with ArkType (No Adapter Needed)

ArkType also implements Standard Schema.

```tsx
import { type } from 'arktype'

const productSearchSchema = type({
  page: 'number = 1',
  filter: 'string = ""',
  sort: '"newest" | "oldest" | "price" = "newest"',
})

export const Route = createFileRoute('/shop/products/')({
  validateSearch: productSearchSchema,
})
```

### Validation with Effect/Schema (No Adapter Needed)

Effect/Schema implements Standard Schema.

```tsx
import { Schema as S } from 'effect'

const productSearchSchema = S.standardSchemaV1(
  S.Struct({
    page: S.NumberFromString.pipe(
      S.optional,
      S.withDefaults({ constructor: () => 1, decoding: () => 1 }),
    ),
    sort: S.Literal('newest', 'oldest', 'price').pipe(
      S.optional,
      S.withDefaults({
        constructor: () => 'newest' as const,
        decoding: () => 'newest' as const,
      }),
    ),
  }),
)

export const Route = createFileRoute('/shop/products/')({
  validateSearch: productSearchSchema,
})
```

### Which Validation Library to Choose

| Library | Adapter Needed? | Key Advantage |
|---------|----------------|---------------|
| **Valibot** | No (Standard Schema) | Smallest bundle, tree-shakeable |
| **ArkType** | No (Standard Schema) | Concise syntax, fast validation |
| **Effect/Schema** | No (Standard Schema) | Best for Effect ecosystem |
| **Zod** | Yes (`@tanstack/zod-adapter`) | Most popular, largest ecosystem |

Standard Schema libraries (Valibot, ArkType, Effect/Schema) pass directly to `validateSearch`. Zod requires the `zodValidator` adapter and `fallback()` for proper type inference. If starting fresh, prefer a Standard Schema library for simpler integration.

### Reading Search Params

```tsx
// In route component
function ProductList() {
  const { page, filter, sort } = Route.useSearch()
  return <div>...</div>
}

// In code-split component (avoids importing Route)
import { getRouteApi } from '@tanstack/react-router'
const routeApi = getRouteApi('/shop/products')

function ProductList() {
  const { page, filter, sort } = routeApi.useSearch()
  return <div>...</div>
}

// Outside of route (loose typing)
function ProductList() {
  const search = useSearch({ strict: false })
  // All values are T | undefined
  return <div>...</div>
}
```

### Writing Search Params

```tsx
// Link with function (preserves existing params)
<Link from={Route.fullPath} search={(prev) => ({ ...prev, page: prev.page + 1 })}>
  Next Page
</Link>

// Generic component across routes: use to="."
<Link to="." search={(prev) => ({ ...prev, page: prev.page + 1 })}>
  Next Page
</Link>

// Imperative navigation
const navigate = useNavigate({ from: Route.fullPath })
navigate({ search: (prev) => ({ page: prev.page + 1 }) })
```

### Search Params in Loaders via loaderDeps

Search params are NOT directly available in loaders. Use `loaderDeps` to explicitly declare which search params the loader depends on. This enables correct caching per unique combination.

```tsx
export const Route = createFileRoute('/posts')({
  validateSearch: z.object({
    offset: z.number().int().nonnegative().catch(0),
    limit: z.number().int().positive().catch(20),
  }),
  loaderDeps: ({ search: { offset, limit } }) => ({ offset, limit }),
  loader: ({ deps: { offset, limit } }) => fetchPosts({ offset, limit }),
})
```

Only include deps you actually use. Returning the entire `search` object causes unnecessary cache invalidation whenever any search param changes.

### Search Params Inherited from Parent Routes

Child routes automatically inherit parent search params. The types merge down the tree.

```tsx
// shop.products.tsx validates { page, filter, sort }
// shop.products.$productId.tsx automatically has access:
export const Route = createFileRoute('/shop/products/$productId')({
  beforeLoad: ({ search }) => {
    search.page   // number - inherited from parent
    search.filter // string - inherited from parent
  },
})
```

### Sharing Params Globally via Root Route

```tsx
// routes/__root.tsx
const globalSearchSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  lang: z.enum(['en', 'es', 'fr']).default('en'),
  debug: z.boolean().default(false),
})

export const Route = createRootRoute({
  validateSearch: zodValidator(globalSearchSchema),
  component: RootComponent,
})
```

All child routes can access `theme`, `lang`, and `debug` via `Route.useSearch()`.

### Search Middlewares

Middlewares transform search params when generating links or after navigation. Use built-in helpers for common cases.

```tsx
import { retainSearchParams, stripSearchParams } from '@tanstack/react-router'

// Retain specific params across all links from this route
export const Route = createRootRoute({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(['rootValue'])],
  },
})

// Strip params when they match defaults (keep URLs clean)
const defaultValues = { one: 'abc', two: 'xyz' }
export const Route = createFileRoute('/hello')({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
})

// Chain multiple middlewares
search: {
  middlewares: [
    retainSearchParams(['retainMe']),
    stripSearchParams({ arrayWithDefaults: defaultValues }),
  ],
}
```

### Complex Types: Arrays, Objects, Dates

TanStack Router uses JSON-first serialization. Nested structures are stored as URL-safe JSON strings.

```tsx
// Arrays
<Link to="/products" search={{ tags: ['react', 'typescript'] }} />
// URL: /products?tags=%5B%22react%22%2C%22typescript%22%5D

// Objects
<Link to="/dashboard" search={{ filters: { status: 'active', type: 'premium' } }} />

// Dates: always use ISO strings, never Date objects
<Link to="/events" search={{ startDate: new Date().toISOString() }} />
```

When updating arrays, always create new references (never mutate):

```tsx
// Add to array
<Link search={(prev) => ({
  ...prev,
  categories: [...(prev.categories || []), 'electronics'],
})} />

// Remove from array
<Link search={(prev) => ({
  ...prev,
  categories: prev.categories?.filter((c) => c !== 'electronics') || [],
})} />
```

### Forms + Search Params (Dual-State Pattern)

Use local state for immediate UI responsiveness, sync to URL on apply.

```tsx
function SynchronizedForm() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/products' })

  const [localFilters, setLocalFilters] = useState({
    minPrice: search.minPrice || 0,
    maxPrice: search.maxPrice || 1000,
  })

  // Sync local state when URL changes (e.g., back/forward)
  useEffect(() => {
    setLocalFilters({
      minPrice: search.minPrice || 0,
      maxPrice: search.maxPrice || 1000,
    })
  }, [search.minPrice, search.maxPrice])

  const applyFilters = () => {
    navigate({
      search: (prev) => ({ ...prev, ...localFilters, page: 1 }),
    })
  }

  return (
    <div>
      <input
        type="number"
        value={localFilters.minPrice}
        onChange={(e) =>
          setLocalFilters((prev) => ({
            ...prev,
            minPrice: parseInt(e.target.value) || 0,
          }))
        }
      />
      <button onClick={applyFilters}>Apply</button>
    </div>
  )
}
```

### Filtering System Pattern

```tsx
function FilterNavigation() {
  const search = useSearch({ from: '/products' })

  return (
    <aside>
      {/* Toggle category filter */}
      {categories.map((category) => (
        <Link
          key={category}
          search={(prev) => ({
            ...prev,
            category: prev.category === category ? undefined : category,
            page: 1,
          })}
          className={search.category === category ? 'active' : ''}
        >
          {category}
        </Link>
      ))}

      {/* Clear all filters */}
      <Link
        search={(prev) => {
          const { category, sort, minPrice, maxPrice, ...rest } = prev
          return rest
        }}
      >
        Clear All Filters
      </Link>
    </aside>
  )
}
```

### Performance: Selectors and Memoization

Use `select` to minimize re-renders by subscribing only to specific search fields.

```tsx
// Only re-render when page changes, not when other search params change
const page = Route.useSearch({ select: (s) => s.page })
```

Avoid calling `navigate` during render -- use `useEffect` instead.

```tsx
// Never do this -- causes infinite loops
if (someCondition) {
  navigate({ search: { redirect: true } })
}

// Do this instead
useEffect(() => {
  if (someCondition) {
    navigate({ search: { redirect: true } })
  }
}, [someCondition, navigate])
```

Memoize expensive search update callbacks:

```tsx
const updateSearch = useCallback(
  (prev) => ({ ...prev, computed: expensiveCalculation(prev) }),
  [],
)

<Link search={updateSearch}>Update</Link>
```

---

See also: `patterns-links-blocking.md` (link options, navigation), `patterns-data.md` (loaderDeps for search-param keying), `config-route-options.md` (validateSearch, loaderDeps options)
