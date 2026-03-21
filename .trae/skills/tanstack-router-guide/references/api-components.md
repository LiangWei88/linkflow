# API Reference: Components

All TanStack Router components for navigation, rendering, error handling, and SSR.

---

## Link

Type-safe navigation anchor element.

```tsx
<Link to="/posts/$postId" params={{ postId: '1' }} search={{ tab: 'comments' }}>
  View Post
</Link>
<Link to="/posts" activeProps={{ className: 'font-bold' }}>Posts</Link>
<Link to="/posts" className="[&.active]:font-bold">Posts</Link>
<Link to="/posts/$postId" params={{ postId: '1' }} preload="intent">View Post</Link>
```

| Prop | Type | Description |
|---|---|---|
| `to` | `string` | Destination route path |
| `from` | `string` | Source route for relative resolution |
| `params` | `object \| (prev) => next` | Path parameters |
| `search` | `object \| (prev) => next` | Search parameters |
| `hash` | `string \| (prev) => next` | URL hash |
| `state` | `object \| (prev) => next` | History state |
| `activeProps` | `AnchorHTMLAttributes \| () => AnchorHTMLAttributes` | Props applied when link is active |
| `inactiveProps` | `AnchorHTMLAttributes \| () => AnchorHTMLAttributes` | Props applied when link is inactive |
| `activeOptions` | `{ exact?, includeHash?, includeSearch?, explicitUndefined? }` | Fine-tune active detection |
| `preload` | `'intent' \| 'viewport' \| 'render' \| false` | Preload strategy |
| `preloadDelay` | `number` | Delay before preload triggers (ms) |
| `disabled` | `boolean` | Disable the link (renders without href) |
| `target` | `string` | Anchor target attribute |
| `replace` | `boolean` | Replace history entry instead of push |
| `resetScroll` | `boolean` | Reset scroll position on navigation |
| `hashScrollIntoView` | `boolean \| ScrollIntoViewOptions` | Control scrolling when navigating to hash links |
| `viewTransition` | `boolean \| ViewTransitionOptions` | Use View Transitions API |
| `mask` | `ToMaskOptions` | Display a different URL than actual destination |
| `reloadDocument` | `boolean` | Force full page reload |
| `ignoreBlocker` | `boolean` | Bypass active navigation blockers |
| `children` | `ReactNode \| ((state: { isActive }) => ReactNode)` | Content. Function form receives active state |

---

## Navigate

Declarative navigation component. Triggers navigation in a `useEffect`.

```tsx
<Navigate to="/login" search={{ redirect: currentPath }} replace />
```

Accepts all `NavigateOptions` props. Returns `null`.

---

## Outlet

Renders the matched child route component. **Required** in parent routes for nesting to work.

```tsx
function RootComponent() {
  return (
    <div>
      <nav>{/* navigation */}</nav>
      <Outlet />
    </div>
  )
}
```

No props. Returns child match's component/error/pending/notFound component, or `null` if not matched.

---

## CatchBoundary

Error boundary that catches errors in child components and renders a fallback.

```tsx
<CatchBoundary
  getResetKey={() => router.state.location.href}
  errorComponent={({ error, reset }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  )}
  onCatch={(error) => reportError(error)}
>
  {children}
</CatchBoundary>
```

| Prop | Type | Description |
|---|---|---|
| `getResetKey` | `() => string` | **Required.** Key that triggers boundary reset when changed |
| `children` | `ReactNode` | **Required.** Content to render |
| `errorComponent` | `Component<{ error, info, reset }>` | Component to render on error. Default: `ErrorComponent` |
| `onCatch` | `(error: Error) => void` | Callback when error is caught |

---

## CatchNotFound

Catches not-found errors thrown by children. Resets when pathname changes.

```tsx
<CatchNotFound
  fallback={(error) => <p>Not found: {error.data}</p>}
  onCatch={(error) => console.warn(error)}
>
  {children}
</CatchNotFound>
```

| Prop | Type | Description |
|---|---|---|
| `children` | `ReactNode` | **Required.** Content to render |
| `fallback` | `(error: NotFoundError) => ReactElement` | Fallback UI on not-found |
| `onCatch` | `(error: NotFoundError) => void` | Callback when not-found is caught |

---

## MatchRoute

Conditionally renders content based on whether a route matches.

```tsx
<MatchRoute to="/posts/$postId" params={{ postId: '1' }}>
  <span>Viewing Post 1</span>
</MatchRoute>
<MatchRoute to="/posts/$postId" pending>
  {(params) => <Spinner show={!!params} />}
</MatchRoute>
```

| Prop | Type | Description |
|---|---|---|
| `to` | `string` | Route path to match |
| `params` | `object` | Params to match against |
| `fuzzy` | `boolean` | Allow partial matching |
| `pending` | `boolean` | Match against pending location |
| `includeSearch` | `boolean` | Include search params in match |
| `children` | `ReactNode \| (params \| false) => ReactNode` | Content when matched. Function always called (receives `false` if unmatched) |

---

## Await

Suspends rendering until a promise resolves. Used with React Suspense for streamed data. Only necessary for React 18 (React 19 can use `use()` instead).

```tsx
<Suspense fallback={<Loading />}>
  <Await promise={deferredData}>
    {(data) => <div>{data.title}</div>}
  </Await>
</Suspense>
```

| Prop | Type | Description |
|---|---|---|
| `promise` | `Promise<T>` | **Required.** Promise to await |
| `children` | `(data: T) => ReactNode` | **Required.** Render function called with resolved data |

---

## ClientOnly

Renders children only on the client. Safe for SSR.

```tsx
<ClientOnly fallback={<div>Loading map...</div>}>
  <Charts />
</ClientOnly>
```

| Prop | Type | Description |
|---|---|---|
| `children` | `ReactNode` | Client-only content |
| `fallback` | `ReactNode` | Content shown during SSR / before hydration |

---

## ErrorComponent

Default error display component. Used as the fallback when no custom `errorComponent` is specified.

| Prop | Type | Description |
|---|---|---|
| `error` | `Error` | The caught error |
| `info` | `{ componentStack: string }` | React error info |
| `reset` | `() => void` | Function to reset the error boundary |

---

## NotFoundComponent

Component rendered when a not-found error occurs in a route.

| Prop | Type | Description |
|---|---|---|
| `data` | `unknown` | Custom data from the `NotFoundError` object |
| `isNotFound` | `boolean` | Always `true` |
| `routeId` | `string` | ID of the route handling the not-found error |

---

## DefaultGlobalNotFound

Renders `<p>Not Found</p>` on the root route when no other route matches and no `notFoundComponent` is provided.

---

## HeadContent

Renders document head tags (title, meta, links) from route `head()` options.

```tsx
// SSR - in <head> tag
<html>
  <head><HeadContent /></head>
  <body><Outlet /><Scripts /></body>
</html>

// SPA - at top of component tree
<>
  <HeadContent />
  <Outlet />
</>
```

No props required.

---

## Scripts

Renders body scripts from route `scripts()` options.

```tsx
<body>
  <Outlet />
  <Scripts />
</body>
```

No props required. Place at end of `<body>`.

---

## ScriptOnce

Renders a `<script>` tag that runs before React hydrates and removes itself from the DOM. Prevents duplicate execution on client navigation.

```tsx
<ScriptOnce children={`(function() { /* theme detection */ })();`} />
```

| Prop | Type | Description |
|---|---|---|
| `children` | `string` | JavaScript code to execute before hydration |

Use cases: theme detection, feature flags, analytics init.

---

## Block

Component-based navigation blocker. Alternative to `useBlocker` hook.

```tsx
<Block
  shouldBlockFn={() => dirty}
  enableBeforeUnload={dirty}
  withResolver
>
  {({ status, proceed, reset }) => (
    <>
      {status === 'blocked' && (
        <div>
          <p>Unsaved changes. Leave?</p>
          <button onClick={proceed}>Yes</button>
          <button onClick={reset}>No</button>
        </div>
      )}
    </>
  )}
</Block>
```

| Prop | Type | Description |
|---|---|---|
| `shouldBlockFn` | `(args?) => boolean \| Promise<boolean>` | Return `true` to block |
| `enableBeforeUnload` | `boolean \| (() => boolean)` | Also block browser close/reload |
| `withResolver` | `boolean` | Enable `status`, `proceed`, `reset` render props |
| `disabled` | `boolean` | Disable the blocker entirely |
| `children` | `(state) => ReactNode` | Render props when `withResolver` is true |

---

See also: `api-hooks.md` (useNavigate, useBlocker, useMatchRoute), `api-functions.md` (createLink, linkOptions), `patterns-links-blocking.md` (custom links, navigation blocking)
