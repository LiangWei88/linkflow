# Troubleshooting

Common issues, errors, and debugging for TanStack Router.

## FAQ

### Should I commit routeTree.gen.ts?

**YES.** It is runtime code, not a build artifact. Other developers need it to build the app.

### Is TanStack Router a framework?

**NO.** It is a router library. TanStack Start is the full-stack framework built on top of it.

### File-based or code-based routing?

**File-based is strongly recommended.** It auto-generates boilerplate, handles code splitting, and scales better. Use code-based only for highly dynamic routes. Both can be mixed.

### Can I use TanStack Router without TypeScript?

Yes, but you lose the biggest advantage. The router works with plain JavaScript, but type-safe navigation, search params, and route context require TypeScript.

### Why choose TanStack Router over React Router?

Key advantages: fully type-safe navigation, JSON-first search params, built-in SWR caching, automatic code splitting, search param validation with Zod/Valibot, search middlewares, typesafe route context, route prefetching, scroll restoration, and custom search param serialization.

### Can I conditionally render the root route?

**NO.** The root route always renders as it is the entry point. Use pathless layout routes (`_auth.tsx`) with `beforeLoad` for conditional rendering.

### How do I handle 404 pages?

Use `defaultNotFoundComponent` on the router, or `notFoundComponent` on specific routes. Throw `notFound()` in loaders for resource-level 404s.

### How do I share search params across routes?

Use `retainSearchParams` middleware:

```tsx
search: { middlewares: [retainSearchParams(['q', 'filter'])] }
```

### How do I use hash-based routing?

```tsx
import { createHashHistory } from '@tanstack/react-router'
const router = createRouter({ routeTree, history: createHashHistory() })
```

Useful for static hosting (GitHub Pages) that does not support server-side URL rewrites.

### What is the difference between Route.useSearch() and useSearch()?

`Route.useSearch()` is automatically typed to the current route's search schema. `useSearch({ from: '/route' })` requires specifying the route. Prefer `Route.useSearch()`.

### How do I use TanStack Router with TanStack Query?

Pass `QueryClient` via router context. Use `ensureQueryData` in loaders, `useSuspenseQuery` in components. Set `defaultPreloadStaleTime: 0` so preload events flow through to Query.

```tsx
const router = createRouter({
  routeTree,
  defaultPreloadStaleTime: 0,
  context: { queryClient },
})
```

### How do I handle auth redirects?

Use `beforeLoad` on a pathless layout route (`_auth.tsx`). Ensure login/public routes are NOT under the auth layout to avoid redirect loops. Throw `redirect({ to: '/login', search: { redirect: location.href } })` if not authenticated.

### How do I fix stale data?

Control data freshness with `staleTime`, use `loaderDeps` for reactive dependencies, and call `router.invalidate()` for manual cache busting. With TanStack Query, use `staleTime` on query options and `defaultPreloadStaleTime: 0` on the router.

### How do I handle multiple layouts?

Use pathless layout routes. Prefix with `_` to create layouts without URL impact. Nest them: `_auth._admin.dashboard.tsx` means a dashboard route wrapped by both auth and admin layouts.

---

## Common Errors

### "Cannot use 'useNavigate' outside of context"

**Cause**: React Router imports still present, or `RouterProvider` missing.

**Fix**: Ensure all imports come from `@tanstack/react-router`. Verify `<RouterProvider router={router} />` wraps your app. Run `npm uninstall react-router-dom react-router` to surface stale imports.

### "Cannot find module routeTree.gen.ts"

**Cause**: Route tree has not been generated.

**Fix**: Run `npx tsr generate`. If using Vite, ensure `@tanstack/router-plugin/vite` is added before the React plugin. The route tree generates automatically during dev but must be explicitly generated for CI/Docker builds.

### "routeTree.gen.ts has errors after renaming routes"

**Cause**: VSCode opens the generated file which may have momentary type errors.

**Fix**: Add to `.vscode/settings.json`:

```json
{
  "files.readonlyInclude": { "**/routeTree.gen.ts": true },
  "files.watcherExclude": { "**/routeTree.gen.ts": true },
  "search.exclude": { "**/routeTree.gen.ts": true }
}
```

### "No autocomplete on Link's `to` prop"

**Cause**: Router type not registered globally.

**Fix**: Add module declaration in your entry file:

```tsx
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

### "Route component not rendering"

**Cause**: Missing `<Outlet />` in parent/layout route.

**Fix**: Every route with children must render `<Outlet />` in its component.

### "No route found" / Route not matching expected URL

**Cause**: File naming convention error or route not added to tree.

**Fix**: Check naming rules:

- `posts.tsx` = `/posts` (layout route, renders children via `<Outlet />`)
- `posts.index.tsx` = `/posts` (index page, the default content)
- `posts.$id.tsx` = `/posts/:id` (dynamic segment)
- `_auth.tsx` = pathless layout (no URL segment)
- Dots (`.`) create nesting, not literal dots in URL
- Leading `_` makes a segment pathless (layout only)

For code-based routing, verify the path has a leading slash (`/about` not `about`) and `getParentRoute` returns the correct parent.

### "Loader runs but data is undefined"

**Cause**: Using wrong hook or missing `from` prop.

**Fix**: Use `Route.useLoaderData()` or `useLoaderData({ from: '/route/path' })`.

### "Search params lose type safety"

**Cause**: Using `useSearch` without `from` or route reference.

**Fix**: Use `Route.useSearch()` for type safety, or provide `from: '/route'` to `useSearch()`.

### "Type error: Property 'x' does not exist on search params"

**Cause**: Missing `validateSearch` on the route.

**Fix**: Add `validateSearch` with Zod schema or validator function to define search param types.

### "Validation adapter not working with search params"

**Cause**: Using Zod without the `zodValidator` adapter, or schema doesn't handle missing values.

**Fix**:

- **Valibot/ArkType**: Pass schema directly to `validateSearch` (implements Standard Schema)
- **Zod**: Use `zodValidator(schema)` adapter and `.catch()` for defaults:

```tsx
import { zodValidator } from '@tanstack/zod-adapter'
validateSearch: zodValidator(z.object({ page: z.number().catch(1) }))
```

### "beforeLoad redirect causes infinite loop"

**Cause**: Redirect target also has auth check that fails.

**Fix**: Ensure login/public routes are NOT under the `_auth` pathless layout.

### "Plugin not generating routes"

**Cause**: Plugin misconfigured or routes not in expected directory

**Fix**:

1. Check `tsr.config.json` or plugin options for `routesDirectory` (default: `./src/routes`)
2. Ensure plugin is listed BEFORE react plugin in vite.config.ts
3. Restart dev server after configuration changes

### "Pending component never shows"

**Cause**: Default `pendingMs` is 1000ms - loader resolves before threshold.

**Fix**: Adjust `pendingMs` on route or router:

```tsx
const router = createRouter({ routeTree, defaultPendingMs: 200 })
```

### "Code splitting not working"

**Cause**: `autoCodeSplitting` not enabled, or route properties are exported.

**Fix**:

1. Set `autoCodeSplitting: true` in plugin options:

```ts
tanstackRouter({ target: 'react', autoCodeSplitting: true })
```

2. Do NOT export route properties from route files -- exported components cannot be code-split:

```tsx
// WRONG - bundled into main bundle
export function PostsComponent() { return <div>Posts</div> }
// CORRECT - properly code-split
function PostsComponent() { return <div>Posts</div> }
```

### "View transition not working"

**Cause**: Browser doesn't support `document.startViewTransition()`, or `viewTransition` prop not set.

**Fix**:

1. Check browser support (Chrome 111+, Edge 111+, Safari 18+)
2. Use `viewTransition={true}` on `<Link>` or in `navigate()` options
3. The API falls back gracefully -- no error is thrown if unsupported

### "Deferred data shows loading forever"

**Cause**: Promise was already awaited in the loader, or it rejected without an error boundary.

**Fix**:

1. Do NOT await deferred promises in the loader -- return the promise directly:

```tsx
loader: async () => {
  const slowData = fetchSlowData()  // No await!
  return { deferredData: slowData }
}
```

2. Add an error boundary or `errorComponent` to catch rejected promises

### "Router events not firing"

**Cause**: Wrong event name or subscribing after navigation already happened.

**Fix**: Subscribe before the router starts and use correct event names:

```tsx
const router = createRouter({ routeTree })
router.subscribe('onResolved', (evt) => { /* fires after every navigation */ })
```

Available events: `onBeforeNavigate`, `onBeforeLoad`, `onLoad`, `onBeforeRouteMount`, `onResolved`, `onRendered`.

### "Component not remounting on param change"

**Cause**: Components stay mounted when only params/search change within the same route.

**Fix**: Use `remountDeps` to control when component remounts:

```tsx
export const Route = createFileRoute('/posts/$postId')({
  remountDeps: ({ params }) => params,
  component: PostComponent,
})
```

### "SSR hydration mismatch"

**Cause**: DOM changes between server render and client hydration.

**Fix**: Use `<ClientOnly>` for browser-only content. Use `<ScriptOnce>` with `suppressHydrationWarning` for theme detection. Hash values are NOT sent to the server -- avoid using `hash` for content that differs between server and client.

### "Hash navigation not working for SSR"

**Cause**: Hash (`#section`) is never sent to the server, so server-rendered content can't use it.

**Fix**: Use search params instead of hash for server-dependent state:

```tsx
<Link to="/page" search={{ section: 'details' }}>Section</Link>
```

### "Docker build fails with route tree errors"

**Cause**: Route tree not generated during Docker build.

**Fix**: Run `tsr generate` before the build step in your Dockerfile:

```dockerfile
RUN npx tsr generate && npm run build
```

### "Environment variables undefined in routes"

**Cause**: Variables not prefixed correctly or accessed at wrong time.

**Fix**:

- Vite: `VITE_` prefix, Webpack: `DefinePlugin`, Rspack: `PUBLIC_` prefix, Esbuild: `define` option
- Restart dev server after `.env` changes; variables are replaced at bundle time

### "`from` path doesn't exist" type error

**Cause**: The `from` path doesn't match any registered route ID.

**Fix**: Route IDs follow the file path (e.g., `/posts/$postId`). Use `Route.useParams()` instead to avoid specifying `from` manually.

### "DevTools not showing"

**Cause**: Wrong import package or DevTools not added to component tree.

**Fix**: Install `@tanstack/router-devtools` (not `@tanstack/react-router-devtools`). Add to root route component. DevTools only show in development mode by default.

---

## Debugging Guide

### Systematic Debugging Workflow

1. **Install DevTools** -- visualize route tree, matches, search params
2. **Check route tree** -- verify `routeTree.gen.ts` is current (`npx tsr generate`)
3. **Inspect matches** -- `useRouterState({ select: s => s.matches })`
4. **Check search params** -- `useLocation()` for raw vs parsed search
5. **Verify type registration** -- ensure `declare module` block exists
6. **Check console** -- look for router warning messages

### Enable DevTools

```tsx
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools initialIsOpen={false} />
    </>
  ),
})
```

### Enable Debug Mode

```tsx
const router = createRouter({
  routeTree,
  debug: true, // Detailed console logging
})
```

### Expose Router Globally for Console Debugging

Set `window.router = router` in dev mode. Useful console commands: `router.state`, `router.state.matches`, `router.state.location`, `router.routesById`, `Object.keys(router.routesById)`.

### Inspect Router State

Use `useRouterState()` to inspect `matches`, `location`, and `status`. Use `useMatchRoute()` to test route matching (`matchRoute({ to: '/posts', fuzzy: true })`). Use `useLocation()` to check `searchStr` (raw) vs `search` (parsed).

### Debug Navigation

```tsx
navigate({ to: '/dashboard', search: { tab: 'settings' } })
  .then(() => console.log('Navigation successful'))
  .catch((err) => console.error('Navigation failed:', err))
```

### Debug Loader Execution

```tsx
loader: async ({ params }) => {
  const start = performance.now()
  const data = await fetchData(params.id)
  console.log(`Loader took ${performance.now() - start}ms`)
  return data
}
```

### Debug Type Inference

When types are not working as expected:

1. Verify the `declare module` block registers your router
2. Regenerate route types: `npx tsr generate`
3. Check that `routeTree.gen.ts` is included in `tsconfig.json`
4. Use `Route.useParams()` / `Route.useSearch()` instead of untyped hooks

### Network Tab Debugging

Monitor these requests:

- **Route code chunks** -- check if lazy routes are loading
- **Loader data requests** -- verify API calls from loaders
- **Failed requests** -- look for 404s or failed API calls

---

## Performance Issues

### Too many re-renders

**Symptom**: Components re-rendering on every search param or state change.

**Fix**: Use `select` to subscribe to specific fields:

```tsx
// WRONG - subscribes to ALL search params
const search = Route.useSearch()

// CORRECT - subscribes only to specific field
const page = Route.useSearch({ select: (s) => s.page })

// Same for router state
const pathname = useRouterState({ select: (s) => s.location.pathname })
```

### Slow initial load

**Symptom**: Large bundle, slow first paint.

**Fix**:

1. Enable `autoCodeSplitting: true` in the router plugin
2. Do not export route properties (component, loader, etc.) from route files
3. Use lazy routes for heavy components
4. Profile with DevTools to identify slow loaders

### Search param changes cause full re-render

**Symptom**: Entire component tree re-renders when search params change.

**Fix**: Use `select` on hooks for referential stability. Avoid new object references in `validateSearch`. Structural sharing is enabled by default.

### Memory leaks with loaders

**Symptom**: Memory usage grows over time, especially with route transitions.

**Fix**: Clean up subscriptions and timers in route components. The SWR cache garbage collects stale data, but component-level subscriptions need `useEffect` cleanup.

---

See also: `config-devtools.md` (devtools setup), `config-bundlers.md` (plugin troubleshooting), `testing-migration.md` (testing setup)
