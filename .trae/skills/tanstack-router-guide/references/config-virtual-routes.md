# Configuration: Virtual File Routes

Programmatically define route structure while referencing real route files.

---

## Virtual File Routes

Virtual file routes let you build a route tree programmatically while referencing real files. Use them when:

- You have an existing route organization you want to keep
- You want to customize file locations
- You want to override the default file-based convention
- You need gradual migration from another router

### Setup

Install the virtual routes package:

```sh
npm install @tanstack/virtual-file-routes
```

Configure the bundler plugin to use virtual routes:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      virtualRouteConfig: './routes.ts', // Path to your virtual routes file
    }),
    react(),
  ],
})
```

Or define virtual routes inline in the bundler config:

```ts
import { rootRoute } from '@tanstack/virtual-file-routes'

const routes = rootRoute('root.tsx', [
  // ... route definitions
])

export default defineConfig({
  plugins: [
    tanstackRouter({ virtualRouteConfig: routes }),
    react(),
  ],
})
```

---

### Helper Functions

All helpers are imported from `@tanstack/virtual-file-routes`.

| Function | Signature | Description |
|----------|-----------|-------------|
| `rootRoute` | `rootRoute(file, children)` | Create the root route. Takes a filename and array of children. |
| `route` | `route(path, file?, children?)` | Create a route. Path is required, file and children are optional. |
| `index` | `index(file)` | Create an index route. Takes a filename. |
| `layout` | `layout(id?, file, children)` | Create a pathless layout route. Optional ID, required file, optional children. |
| `physical` | `physical(pathPrefix, directory)` | Mount a directory using standard file-based routing convention at a URL prefix. |

---

### Complete Example

```ts
// routes.ts
import {
  rootRoute,
  route,
  index,
  layout,
  physical,
} from '@tanstack/virtual-file-routes'

export const routes = rootRoute('root.tsx', [
  index('index.tsx'),
  layout('pathlessLayout.tsx', [
    route('/dashboard', 'app/dashboard.tsx', [
      index('app/dashboard-index.tsx'),
      route('/invoices', 'app/dashboard-invoices.tsx', [
        index('app/invoices-index.tsx'),
        route('$id', 'app/invoice-detail.tsx'),
      ]),
    ]),
    // Mount standard file-based routing under /posts
    physical('/posts', 'posts'),
  ]),
])
```

---

### Route Without a File (Path Prefix)

Create a route without a component file to set a common path prefix:

```ts
export const routes = rootRoute('root.tsx', [
  route('/hello', [
    route('/world', 'world.tsx'),    // full path: /hello/world
    route('/universe', 'universe.tsx'), // full path: /hello/universe
  ]),
])
```

---

### Layout with Custom ID

Specify a custom pathless ID different from the filename:

```ts
export const routes = rootRoute('root.tsx', [
  layout('my-layout-id', 'pathlessLayout.tsx', [
    // ... children
  ]),
])
```

---

### Physical Routes (Mounting Directories)

Mount an entire directory using standard file-based conventions at a given URL prefix:

```ts
// Mount the 'posts/' directory at /posts
physical('/posts', 'posts')
```

Merge physical routes at the current level (no prefix):

```ts
// Merge features/ routes at root level
physical('features')
// Or equivalently:
physical('', 'features')
```

IMPORTANT: When merging at the same level, ensure no conflicting route paths exist between virtual and physical routes. Conflicts produce a generator error.

---

### Virtual Routes Inside File-Based Routing (__virtual.ts)

You can switch to virtual route configuration for specific subtrees within a standard file-based routing project by creating a `__virtual.ts` file in a directory:

```
/routes
├── __root.tsx
├── index.tsx
├── foo/
│   ├── bar/
│   │   ├── __virtual.ts    <-- switches to virtual config for this subtree
│   │   ├── details.tsx
│   │   ├── home.tsx
│   │   └── route.ts
│   └── bar.tsx
```

```ts
// routes/foo/bar/__virtual.ts
import {
  defineVirtualSubtreeConfig,
  index,
  route,
} from '@tanstack/virtual-file-routes'

export default defineVirtualSubtreeConfig([
  index('home.tsx'),
  route('$id', 'details.tsx'),
])
```

`defineVirtualSubtreeConfig` accepts:
- A subtree config object (array of routes)
- A function returning a subtree config object
- An async function returning a subtree config object

You can nest these arbitrarily deep, switching back and forth between file-based and virtual configuration at any level.

---

### Virtual Routes via CLI (tsr.config.json)

```json
{
  "virtualRouteConfig": "./routes.ts"
}
```

Or inline as JSON:

```json
{
  "virtualRouteConfig": {
    "type": "root",
    "file": "root.tsx",
    "children": [
      {
        "type": "index",
        "file": "home.tsx"
      },
      {
        "type": "route",
        "file": "posts/posts.tsx",
        "path": "/posts",
        "children": [
          {
            "type": "index",
            "file": "posts/posts-home.tsx"
          },
          {
            "type": "route",
            "file": "posts/posts-detail.tsx",
            "path": "$postId"
          }
        ]
      },
      {
        "type": "layout",
        "id": "first",
        "file": "layout/first-pathless-layout.tsx",
        "children": [
          {
            "type": "route",
            "file": "a.tsx",
            "path": "/route-a"
          }
        ]
      }
    ]
  }
}
```

---

See also: `config-routing.md` (file naming conventions), `config-bundlers.md` (plugin configuration)
