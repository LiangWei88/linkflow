# Configuration: DevTools & IDE

DevTools setup, production devtools, lazy-loading, IDE configuration, and linter/formatter ignores for TanStack Router.

---

## DevTools Configuration

Install the devtools package:

```sh
npm install @tanstack/react-router-devtools
```

### Floating Mode (Default)

Renders as a fixed, floating element with a toggle button in the corner. Toggle state persists in localStorage.

```tsx
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

// In __root.tsx component
export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools initialIsOpen={false} position="bottom-left" />
    </>
  ),
})
```

### Floating Mode Options (TanStackRouterDevtools)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `router` | `Router` | Auto-detected from context | The router instance to connect to. |
| `initialIsOpen` | `boolean` | `false` | Whether devtools panel starts open |
| `position` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'bottom-left'` | Position of the toggle button |
| `panelProps` | `PropsObject` | `{}` | Props to add to the panel (className, style, etc.) |
| `closeButtonProps` | `PropsObject` | `{}` | Props for the close button (className, style, onClick to extend handler) |
| `toggleButtonProps` | `PropsObject` | `{}` | Props for the toggle button (className, style, onClick to extend handler) |
| `shadowDOMTarget` | `ShadowRoot` | `undefined` | Render devtools styles inside a Shadow DOM instead of the document head |
| `containerElement` | `string \| any` | `'footer'` | Container element type for accessibility purposes |

### Fixed/Panel Mode

Import `TanStackRouterDevtoolsPanel` for full control over positioning:

```tsx
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

function DebugPanel() {
  return (
    <div className="debug-sidebar">
      <TanStackRouterDevtoolsPanel router={router} />
    </div>
  )
}
```

### Panel Mode Options (TanStackRouterDevtoolsPanel)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `router` | `Router` | Required when outside RouterProvider | The router instance to connect to |
| `style` | `StyleObject` | `undefined` | Inline styles for the panel |
| `className` | `string` | `undefined` | CSS classes for the panel |
| `isOpen` | `boolean` | `undefined` | Controlled open/close state |
| `setIsOpen` | `(isOpen: boolean) => void` | `undefined` | Callback to toggle panel state |
| `handleDragStart` | `(e: any) => void` | `undefined` | Handle for drag behavior |
| `shadowDOMTarget` | `ShadowRoot` | `undefined` | Render styles inside a Shadow DOM |

### Embedded Mode

Embed the devtools directly as a component in your layout:

```tsx
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <TanStackRouterDevtoolsPanel
        router={router}
        style={{ height: '300px' }}
        className="devtools-embed"
      />
    </>
  )
}
```

---

## Production DevTools

For debugging production issues, use the production-safe import. This bypasses the `NODE_ENV` check:

```tsx
import { TanStackRouterDevtoolsInProd } from '@tanstack/react-router-devtools'
```

It has all the same options as `TanStackRouterDevtools`.

---

## Lazy-Loaded DevTools (Tree-Shake in Production)

Completely exclude devtools from your production bundle:

```tsx
import React from 'react'

const TanStackRouterDevtools =
  process.env.NODE_ENV === 'production'
    ? () => null
    : React.lazy(() =>
        import('@tanstack/react-router-devtools').then((res) => ({
          default: res.TanStackRouterDevtools,
        })),
      )
```

---

## IDE Configuration

### VSCode

Add to `.vscode/settings.json` to mark the generated route tree as read-only and exclude it from search:

```json
{
  "files.readonlyInclude": {
    "**/routeTree.gen.ts": true
  },
  "files.watcherExclude": {
    "**/routeTree.gen.ts": true
  },
  "search.exclude": {
    "**/routeTree.gen.ts": true
  }
}
```

### Linter and Formatter Ignores

**Prettier** - add to `.prettierignore`:

```
**/routeTree.gen.ts
```

**ESLint** - add to `.eslintignore`:

```
**/routeTree.gen.ts
```

**Biome** - add to `biome.json`:

```json
{
  "files": {
    "ignore": ["**/routeTree.gen.ts"]
  }
}
```

---

See also: `config-bundlers.md` (plugin setup), `troubleshooting.md` (debugging guide)
