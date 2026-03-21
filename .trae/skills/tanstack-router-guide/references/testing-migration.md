# Testing & Migration

Testing setup, route testing patterns, and migration guides for TanStack Router.

## Testing

### Vitest + React Testing Library Setup

Install dependencies:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Configure `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'

// @ts-expect-error
global.IS_REACT_ACT_ENVIRONMENT = true
```

### Testing with Memory History

Use `createMemoryHistory` for unit tests to avoid browser history side effects:

```tsx
import {
  createMemoryHistory,
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'

function renderWithRouter(initialPath = '/') {
  const rootRoute = createRootRoute({ component: () => <Outlet /> })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home</div>,
  })
  const routeTree = rootRoute.addChildren([indexRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
  return render(<RouterProvider router={router} />)
}
```

### Testing File-Based Routes

Import and use the generated route tree directly:

```tsx
import { routeTree } from './routeTree.gen'
import { createRouter, createMemoryHistory, RouterProvider } from '@tanstack/react-router'

function renderWithFileRoutes(initialPath = '/') {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
  return render(<RouterProvider router={router} />)
}
```

Ensure `routeTree.gen.ts` is generated before running tests (`npx tsr generate` in a pre-test script).

### Testing Route Guards and Loaders

```tsx
test('should redirect unauthenticated users', async () => {
  const rootRoute = createRootRouteWithContext<{ auth: { isAuthenticated: boolean } }>()({
    component: () => <Outlet />,
  })

  const protectedRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/protected',
    beforeLoad: ({ context }) => {
      if (!context.auth.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: () => <div>Protected</div>,
  })

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <div>Login</div>,
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([protectedRoute, loginRoute]),
    history: createMemoryHistory({ initialEntries: ['/protected'] }),
    context: { auth: { isAuthenticated: false } },
  })

  render(<RouterProvider router={router} />)
  expect(await screen.findByText('Login')).toBeInTheDocument()
})
```

### Testing Async Loaders

```tsx
test('should display loader data', async () => {
  const mockFetch = vi.fn().mockResolvedValue({ name: 'Test User' })

  const userRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/users/$userId',
    loader: ({ params }) => mockFetch(params.userId),
    component: function UserComponent() {
      const data = Route.useLoaderData()
      return <div>{data.name}</div>
    },
  })

  // ... render with router at '/users/123'

  await waitFor(() => {
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })
  expect(mockFetch).toHaveBeenCalledWith('123')
})
```

### Mocking Router Context

```tsx
const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ['/dashboard'] }),
  context: {
    auth: { user: { id: '1', name: 'Test User' }, isAuthenticated: true },
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  },
})
```

### Common Test Problems

**"window is not defined"** -- set `environment: 'jsdom'` in vitest config.

**Router context missing** -- always render components within `<RouterProvider>`.

**Async data not loading** -- use `waitFor` from Testing Library to wait for loader resolution.

**Route tree not found** -- run `npx tsr generate` before tests, or include the router plugin in your vitest config.

---

## Migration Guides

### React Router to TanStack Router

**Concept mapping**:

| React Router | TanStack Router |
|---|---|
| `createBrowserRouter([...])` | `createRouter({ routeTree })` |
| `<Routes>/<Route>` | Route tree (file-based or code-based) |
| `<Route path="/posts/:id">` | `posts.$id.tsx` or `createRoute({ path: '/posts/$id' })` |
| `useParams()` | `Route.useParams()` |
| `useSearchParams()` | `Route.useSearch()` with `validateSearch` |
| `useNavigate()` | `useNavigate()` (similar API, object form) |
| `<Navigate to="/">` | `throw redirect({ to: '/' })` in `beforeLoad` |
| `<Link to="/posts/123">` | `<Link to="/posts/$postId" params={{ postId: '123' }}>` |
| `loader` (exported function) | `loader` (route option) |
| `action` (exported function) | Handle with mutations/form libraries |
| `<Outlet>` | `<Outlet />` (same concept) |
| `errorElement` | `errorComponent` |
| `lazy()` | `createLazyFileRoute()` or `autoCodeSplitting` |
| `useLoaderData()` | `Route.useLoaderData()` |
| `defer()` / `<Await>` | Return unresolved promises from loader |

**Migration steps**:

1. Install TanStack Router alongside React Router
2. Set up Vite plugin and `tsr.config.json`
3. Create `__root.tsx` with root layout
4. Convert each route file one at a time
5. Replace all `Link`, `useNavigate`, `useParams` imports
6. Add `validateSearch` schemas for search params
7. Uninstall `react-router-dom` / `react-router` completely
8. Run `grep -r "react-router" src/` to find any remaining imports

**Common migration pitfall**: Blank screen after migration means React Router imports are still present. Uninstall React Router to surface all TypeScript errors for remaining imports.

### React Location to TanStack Router

Key differences:

- React Location uses generics for type inference; TanStack Router uses module declaration merging
- React Location uses a flat route array; TanStack Router uses a tree starting from root route
- File-based routing is recommended over code-based in TanStack Router

Migration steps:

1. Install `@tanstack/react-router` and `@tanstack/router-devtools`
2. Uninstall `@tanstack/react-location` and `@tanstack/react-location-devtools`
3. Set up the Vite plugin and `tsr.config.json`
4. Create `src/routes/__root.tsx` with root layout
5. Convert each route to a file-based route
6. Move loaders into route definitions
7. Update `Link` components with `to` and `params` props
8. Run `npx tsr generate` and update the main entry file

---

See also: `troubleshooting.md` (common test problems, debugging), `config-bundlers.md` (route generation for CI/tests), `deployment-integrations.md` (deployment platforms)
