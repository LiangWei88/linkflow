# Configuration: Routing Setup

File naming conventions, route matching, type registration, and code-based route trees for TanStack Router.

---

## File Naming Conventions

### Convention Summary

| Feature | Syntax | Description |
|---------|--------|-------------|
| Root route | `__root.tsx` | Must be in the root of `routesDirectory`. Always matched and rendered. |
| `.` separator | `blog.post.tsx` | Denotes nesting: `blog.post` is a child of `blog`. |
| `$` param | `$postId.tsx` | Dynamic segment. Captures URL value into `params`. |
| `$` splat | `$.tsx` | Catch-all route. Captures remaining path into `params._splat`. |
| `_` prefix (pathless) | `_layout.tsx` | Pathless layout route. Wraps children without adding a URL segment. |
| `_` suffix (non-nested) | `posts_.tsx` | Breaks out of parent nesting. Renders its own component tree. |
| `-` prefix (excluded) | `-helpers.tsx`, `-components/` | Excluded from route generation. Use for co-located utilities. |
| `(folder)` group | `(auth)/login.tsx` | Organizational grouping. No effect on URL path or route tree. |
| `[x]` escaping | `script[.]js.tsx` | Escapes special characters. `script[.]js.tsx` becomes `/script.js`. |
| `index` token | `index.tsx` | Matches parent path exactly. Configurable via `indexToken` option. |
| `.route.tsx` suffix | `blog/route.tsx` | Route config file for directory-based routes. Configurable via `routeToken` option. |

### Flat Routes

Use `.` in filenames to denote nesting without creating directories:

| Filename | Route Path | Component Output |
|----------|------------|------------------|
| `__root.tsx` | -- | `<Root>` |
| `index.tsx` | `/` (exact) | `<Root><RootIndex>` |
| `about.tsx` | `/about` | `<Root><About>` |
| `posts.tsx` | `/posts` | `<Root><Posts>` |
| `posts.index.tsx` | `/posts` (exact) | `<Root><Posts><PostsIndex>` |
| `posts.$postId.tsx` | `/posts/$postId` | `<Root><Posts><Post>` |
| `posts_.$postId.edit.tsx` | `/posts/$postId/edit` | `<Root><EditPost>` |
| `settings.tsx` | `/settings` | `<Root><Settings>` |
| `settings.profile.tsx` | `/settings/profile` | `<Root><Settings><Profile>` |

### Directory Routes

Use directories for wider route hierarchies:

| Filename | Route Path | Component Output |
|----------|------------|------------------|
| `__root.tsx` | -- | `<Root>` |
| `index.tsx` | `/` (exact) | `<Root><RootIndex>` |
| `posts.tsx` | `/posts` | `<Root><Posts>` |
| `posts/index.tsx` | `/posts` (exact) | `<Root><Posts><PostsIndex>` |
| `posts/$postId.tsx` | `/posts/$postId` | `<Root><Posts><Post>` |
| `settings/profile.tsx` | `/settings/profile` | `<Root><Settings><Profile>` |
| `account/route.tsx` | `/account` | `<Root><Account>` |
| `account/overview.tsx` | `/account/overview` | `<Root><Account><Overview>` |

### Mixed Flat and Directory Routes

Combine both approaches freely within the same project. Directories for wide hierarchies, flat for deep/unique paths.

### Pathless Route Group Directories

Use `()` directories for organization without affecting URLs:

```
routes/
├── index.tsx
├── (app)/
│   ├── dashboard.tsx    ->  /dashboard
│   ├── settings.tsx     ->  /settings
├── (auth)/
│   ├── login.tsx        ->  /login
│   ├── register.tsx     ->  /register
```

The `(app)` and `(auth)` directories do not appear in URLs or the route tree.

### Excluding Files and Folders

Prefix with `-` to exclude from route generation:

```
routes/
├── posts.tsx
├── -posts-table.tsx          <-- excluded
├── -components/              <-- entire directory excluded
│   ├── header.tsx
│   ├── footer.tsx
```

Import excluded files normally into route files:

```tsx
import { PostsTable } from './-posts-table'
import { PostsHeader } from './-components/header'
```

### Optional Path Parameters

Use `{-$paramName}` syntax for optional segments:

```tsx
// posts.{-$category}.tsx
export const Route = createFileRoute('/posts/{-$category}')({
  component: PostsComponent,
})
// Matches: /posts (category is undefined), /posts/tech (category is "tech")
```

Multiple optional parameters:

```tsx
// posts.{-$category}.{-$slug}.tsx
// Matches: /posts, /posts/tech, /posts/tech/hello-world
```

Routes with optional parameters rank lower than exact matches.

---

## Route Matching Algorithm

TanStack Router automatically sorts all routes by specificity. The order you define routes does not matter -- the router sorts them internally.

### Priority Order (highest to lowest)

1. **Index routes** (`/`) -- exact match at a nesting level
2. **Static routes** -- most specific to least specific (e.g., `about/us` before `about`)
3. **Dynamic routes** -- longest to shortest (e.g., `$postId/$revisionId` before `$postId`)
4. **Splat/wildcard routes** (`$`) -- always matched last

### Example Sort

Before sorting:

```
Root
  - blog
    - $postId
    - /
    - new
  - /
  - *
  - about
  - about/us
```

After automatic sorting:

```
Root
  - /          (index - highest priority)
  - about/us   (static, more specific)
  - about      (static, less specific)
  - blog
    - /        (index)
    - new      (static)
    - $postId  (dynamic)
  - *          (splat - lowest priority)
```

### Matching Behavior

- `notFoundMode: 'fuzzy'` (default): Shows 404 at the nearest ancestor with a `notFoundComponent`.
- `notFoundMode: 'root'`: Always shows 404 at the root level.

---

## Router Type Registration

Register the router type globally for full type inference across the application. This is required for type-safe `Link`, `useNavigate`, `useSearch`, `useParams`, and all other router APIs.

```ts
// src/main.tsx (or wherever createRouter is called)
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

// CRITICAL: Always register the router type
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

This uses TypeScript's Declaration Merging feature to extend the `Register` interface on `@tanstack/react-router`. Without this declaration, you lose type-safe route paths, params, search params, and context across the entire project.

---

## Code-Based Route Tree

For projects not using file-based routing, build the route tree manually:

```tsx
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Link,
} from '@tanstack/react-router'

// Root route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <Outlet />
    </>
  ),
})

// Basic routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <div>Home</div>,
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'about',
  component: () => <div>About</div>,
})

// Dynamic route
const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'posts/$postId',
  component: () => {
    const { postId } = postRoute.useParams()
    return <div>Post: {postId}</div>
  },
})

// Pathless layout route (id instead of path)
const authLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth-layout',
  component: () => (
    <div className="auth-wrapper">
      <Outlet />
    </div>
  ),
})

// Build the tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  postRoute,
  authLayout.addChildren([
    // children of authLayout
  ]),
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

Path normalization in code-based routing:

| Path | Normalized |
|------|------------|
| `/` | `/` (index) |
| `/about` | `about` |
| `about/` | `about` |
| `about` | `about` |
| `$` | `$` (splat) |
| `/$` | `$` |

---

See also: `config-bundlers.md` (plugin setup), `config-virtual-routes.md` (virtual file routes), `config-route-options.md` (route option details)
