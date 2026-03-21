# TanStack Start Usage Patterns

## File Organization

```
src/utils/
├── users.functions.ts   # createServerFn wrappers (safe to import anywhere)
├── users.server.ts      # Server-only helpers (only import in handlers)
└── schemas.ts           # Shared validation schemas (client-safe)
```

- **`.functions.ts`** — Export `createServerFn` wrappers. Safe to statically import from client code.
- **`.server.ts`** — Server-only code. Only import inside server function handlers.
- **`.ts`** (no suffix) — Client-safe code (types, schemas, constants).

## Rendering Markdown

Two methods: Static (build-time) and Dynamic (runtime). Both share a common unified pipeline.

### Markdown Processing Pipeline

```bash
npm install unified remark-parse remark-gfm remark-rehype rehype-raw rehype-slug rehype-autolink-headings rehype-stringify shiki html-react-parser gray-matter
```

```tsx
// src/utils/markdown.ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeStringify from 'rehype-stringify'

export async function renderMarkdown(content: string) {
  const headings: Array<{ id: string; text: string; level: number }> = []
  const result = await unified()
    .use(remarkParse).use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw).use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
    .use(() => (tree) => { /* extract headings for TOC */ })
    .use(rehypeStringify).process(content)
  return { markup: String(result), headings }
}
```

### Markdown React Component

```tsx
import parse, { type HTMLReactParserOptions, domToReact, type DOMNode, Element } from 'html-react-parser'
import { Link } from '@tanstack/react-router'

export function Markdown({ content }: { content: string }) {
  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element && domNode.name === 'a') {
        const href = domNode.attribs.href
        if (href?.startsWith('/')) {
          return <Link to={href}>{domToReact(domNode.children as DOMNode[], options)}</Link>
        }
      }
      if (domNode instanceof Element && domNode.name === 'img') {
        return <img {...domNode.attribs} loading="lazy" />
      }
    },
  }
  return <div className="prose">{parse(content, options)}</div>
}
```

**Syntax highlighting with Shiki (dual theme):**

```tsx
import { codeToHtml } from 'shiki'

export async function highlightCode(code: string, lang: string) {
  return codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'tokyo-night' },
  })
}
```

### Method 1: Static with content-collections

```bash
npm install @content-collections/core @content-collections/vite
```

```tsx
// content-collections.ts
const posts = defineCollection({
  name: 'posts', directory: './src/blog', include: '*.md',
  schema: (z) => ({ title: z.string(), published: z.string().date(), authors: z.string().array() }),
  transform: ({ content, ...post }) => ({
    ...post, slug: post._meta.path, content: matter(content).content,
  }),
})
export default defineConfig({ collections: [posts] })
```

Add `contentCollections()` to Vite plugins. Access posts via `import { allPosts } from 'content-collections'`.

| Approach | Best For | Pros | Cons |
|----------|----------|------|------|
| content-collections | Blog posts, static docs | Type-safe, fast runtime | Requires rebuild |
| Dynamic fetching | External docs, frequently updated | Always fresh | Runtime overhead |

### Method 2: Dynamic from GitHub

```tsx
export const fetchDocs = createServerFn({ method: 'GET' })
  .inputValidator((params: { repo: string; branch: string; filePath: string }) => params)
  .handler(async ({ data }) => {
    const url = `https://raw.githubusercontent.com/${data.repo}/${data.branch}/${data.filePath}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
    const rawContent = await response.text()
    const { data: frontmatter, content } = matter(rawContent)
    return { frontmatter, content }
  })
```

For directory navigation, use GitHub Contents API: `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`.

## Progressive Enhancement

```tsx
import { ClientOnly } from '@tanstack/react-router'

function SearchForm() {
  return (
    <form action="/search" method="get">
      <input name="q" />
      <ClientOnly fallback={<button type="submit">Search</button>}>
        <EnhancedSearchButton />
      </ClientOnly>
    </form>
  )
}
```

## Error Handling

### Route-Level Error Boundaries

```tsx
export const Route = createFileRoute('/posts/$postId')({
  errorComponent: ({ error, reset }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  ),
})
```

### Default Error Component

```tsx
// src/router.tsx
export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: ({ error }) => <ErrorComponent error={error} />,
  })
}
```

### Not Found

```tsx
import { notFound } from '@tanstack/react-router'

const getPost = createServerFn()
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const post = await db.findPost(data.id)
    if (!post) throw notFound()
    return post
  })
```

## Execution Model Patterns

### Architecture Decision Framework

**Choose Server-Only when:**
- Accessing sensitive data (environment variables, secrets)
- File system operations, database connections, external API keys

**Choose Client-Only when:**
- DOM manipulation, browser APIs (localStorage, geolocation)
- User interaction handling, analytics/tracking

**Choose Isomorphic when:**
- Data formatting/transformation, business logic
- Shared utilities, route loaders (isomorphic by nature)

### RPC vs Direct Function Calls

```tsx
// createServerFn: RPC pattern — server execution, client callable via network request
const fetchUser = createServerFn().handler(async () => await db.users.find())
const user = await fetchUser()  // Network request from client

// createServerOnlyFn: Crashes if called from client
const getSecret = createServerOnlyFn(() => process.env.SECRET)
getSecret()  // Throws error on client

// createClientOnlyFn: Crashes if called from server
const saveLocal = createClientOnlyFn((k: string, v: any) =>
  localStorage.setItem(k, JSON.stringify(v))
)
```

### Environment-Aware Storage

```tsx
const storage = createIsomorphicFn()
  .server((key: string) => {
    const fs = require('node:fs')
    return JSON.parse(fs.readFileSync('.cache', 'utf-8'))[key]
  })
  .client((key: string) => JSON.parse(localStorage.getItem(key) || 'null'))
```

## Database Integration

TanStack Start works with **any database provider** — call into your database adapter from server functions or server routes.

```tsx
const db = createMyDatabaseClient()

export const getUser = createServerFn().handler(async ({ context }) => {
  return db.getUser(context.userId)
})

export const createUser = createServerFn({ method: 'POST' }).handler(async ({ data }) => {
  return db.createUser(data)
})
```

### Recommended Partners

**Neon** — Serverless PostgreSQL: Auto-scaling, database branching for dev/testing, built-in connection pooling, point-in-time restore, bottomless storage, generous free tier.

**Convex** — Real-time database: Serverless, declarative data model, automatic conflict resolution, real-time subscriptions, scalable and transactional.

**Prisma Postgres** — Instant Postgres: Edge-optimized with local region routing, auto-scaling from zero to millions, unikernel isolation for security, web UI for data management, works with Prisma ORM.

## Tutorial Patterns

### File-Based CRUD (DevJokes Pattern)

Server functions with Node.js `fs` module for file-based storage:

```tsx
const JOKES_FILE = 'src/data/jokes.json'

export const getJokes = createServerFn({ method: 'GET' }).handler(async () => {
  const data = await fs.promises.readFile(JOKES_FILE, 'utf-8')
  return JSON.parse(data)
})

export const addJoke = createServerFn({ method: 'POST' })
  .inputValidator((data: { question: string; answer: string }) => data)
  .handler(async ({ data }) => {
    const jokes = await getJokes()
    const newJoke = { id: uuidv4(), ...data }
    await fs.promises.writeFile(JOKES_FILE, JSON.stringify([...jokes, newJoke], null, 2))
    return newJoke
  })
```

After mutation, call `router.invalidate()` to refresh loader data.

### External API Integration (TMDB Pattern)

Secure API calls using server functions to hide credentials:

```tsx
const fetchMovies = createServerFn().handler(async () => {
  const response = await fetch('https://api.themoviedb.org/3/discover/movie?...', {
    headers: { Authorization: `Bearer ${process.env.TMDB_AUTH_TOKEN}` },
  })
  if (!response.ok) throw new Error(`Failed: ${response.statusText}`)
  return response.json()
})

export const Route = createFileRoute('/movies')({
  loader: async () => {
    const data = await fetchMovies()
    return { movies: data.results }
  },
  component: MoviesPage,
})
```

Key pattern: `createServerFn()` keeps API tokens server-only. Route loader calls the server function. Component accesses data via `Route.useLoaderData()`.

> **Tip:** For interactive features (real-time updates, infinite scrolling, caching, optimistic updates), use TanStack Query instead of route loaders. Route loaders are best for initial page data.

## See Also

- [Auth & Sessions](auth-sessions.md) — authentication patterns, session management
- [Data Loading & Streaming](data-streaming.md) — loader patterns, streaming
- [SEO & LLMO](seo-llmo.md) — meta tags, structured data
- [Server Routes](server-routes.md) — API endpoint patterns
- [Configuration](configuration.md) — project structure, Tailwind setup
- [Troubleshooting](troubleshooting.md) — common errors, debugging
