# Patterns: Links, Navigation & Blocking

Link options, custom link components, navigation patterns, and navigation blocking for TanStack Router.

---

## Link Options Helper

### Reusable Type-Safe Link Options

The `linkOptions()` function type-checks navigation options at definition time, before they are used. Without it, `to` is inferred as `string` and type errors only surface when spread into `<Link>`.

```tsx
import { linkOptions } from '@tanstack/react-router'

const dashboardLinkOptions = linkOptions({
  to: '/dashboard',
  search: { search: '' },
})

// Reusable across Link, navigate, redirect
<Link {...dashboardLinkOptions} />
navigate(dashboardLinkOptions)
throw redirect(dashboardLinkOptions)
```

### Array of Link Options for Navigation Menus

```tsx
const navOptions = linkOptions([
  {
    to: '/dashboard',
    label: 'Summary',
    activeOptions: { exact: true },
  },
  {
    to: '/dashboard/invoices',
    label: 'Invoices',
  },
  {
    to: '/dashboard/users',
    label: 'Users',
  },
])

function DashboardNav() {
  return (
    <div className="flex">
      {navOptions.map((option) => (
        <Link
          {...option}
          key={option.to}
          activeProps={{ className: 'font-bold' }}
          className="p-2"
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}
```

The `label` property (not part of `Link` props) passes through -- `linkOptions` infers and returns the full input.

---

## Custom Link Components

### createLink for Cross-Cutting Concerns

`createLink` wraps any component to have the same type-safe navigation props as `<Link>`.

```tsx
import * as React from 'react'
import { createLink, LinkComponent } from '@tanstack/react-router'

interface BasicLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {}

const BasicLinkComponent = React.forwardRef<HTMLAnchorElement, BasicLinkProps>(
  (props, ref) => (
    <a ref={ref} {...props} className="block px-3 py-2 text-blue-700" />
  ),
)

const CreatedLinkComponent = createLink(BasicLinkComponent)

export const CustomLink: LinkComponent<typeof BasicLinkComponent> = (props) => {
  return <CreatedLinkComponent preload="intent" {...props} />
}
```

### React Aria Components

```tsx
import { createLink } from '@tanstack/react-router'
import { Link as RACLink, MenuItem } from 'react-aria-components'

export const Link = createLink(RACLink)
export const MenuItemLink = createLink(MenuItem)
```

### MUI Link and Button

```tsx
import { createLink } from '@tanstack/react-router'
import { Link } from '@mui/material'
import { Button } from '@mui/material'

// MUI Link
export const CustomLink = createLink(Link)

// MUI Button as link
const MUIButtonLinkComponent = React.forwardRef<
  HTMLAnchorElement,
  ButtonProps<'a'>
>((props, ref) => <Button ref={ref} component="a" {...props} />)

export const CustomButtonLink = createLink(MUIButtonLinkComponent)
```

### Mantine

```tsx
import { createLink } from '@tanstack/react-router'
import { Anchor } from '@mantine/core'

const MantineLinkComponent = React.forwardRef<HTMLAnchorElement, AnchorProps>(
  (props, ref) => <Anchor ref={ref} {...props} />,
)

export const CustomLink = createLink(MantineLinkComponent)
```

---

## Navigation Blocking

### useBlocker with Confirmation Dialog

Prevent navigation when a form is dirty. `shouldBlockFn` returns `true` to block, `false` to allow.

```tsx
import { useBlocker } from '@tanstack/react-router'

function EditForm() {
  const [formIsDirty, setFormIsDirty] = useState(false)

  useBlocker({
    shouldBlockFn: () => {
      if (!formIsDirty) return false
      const shouldLeave = confirm('Are you sure you want to leave?')
      return !shouldLeave
    },
  })

  // ...
}
```

### useBlocker with Custom UI (Resolver Pattern)

Use `withResolver: true` to get `proceed`/`reset` functions for a custom confirmation UI. When `withResolver` is `true`, the return value of `shouldBlockFn` does NOT resolve the blocking -- only `proceed()` or `reset()` do.

```tsx
function EditForm() {
  const [formIsDirty, setFormIsDirty] = useState(false)

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => formIsDirty,
    withResolver: true,
  })

  return (
    <>
      {/* form fields... */}
      {status === 'blocked' && (
        <div>
          <p>You have unsaved changes. Leave anyway?</p>
          <button onClick={proceed}>Yes, leave</button>
          <button onClick={reset}>No, stay</button>
        </div>
      )}
    </>
  )
}
```

### Type-Safe shouldBlockFn

`shouldBlockFn` receives `current` and `next` location with full type safety:

```tsx
const { proceed, reset, status } = useBlocker({
  shouldBlockFn: ({ current, next }) => {
    return (
      current.routeId === '/foo' &&
      next.fullPath === '/bar/$id' &&
      next.params.id === 123
    )
  },
  withResolver: true,
})
```

### enableBeforeUnload

Control the browser's `onbeforeunload` event separately from router-level blocking. This shows the native "Are you sure you want to leave?" dialog on tab close/refresh.

```tsx
useBlocker({
  shouldBlockFn: () => formIsDirty,
  enableBeforeUnload: formIsDirty, // or () => formIsDirty
})
```

### Block Component (Declarative)

The `<Block>` component provides the same functionality as `useBlocker` via JSX.

```tsx
import { Block } from '@tanstack/react-router'

function EditForm() {
  const [formIsDirty, setFormIsDirty] = useState(false)

  return (
    <Block shouldBlockFn={() => formIsDirty} withResolver enableBeforeUnload={formIsDirty}>
      {({ status, proceed, reset }) => (
        <>
          {/* form... */}
          {status === 'blocked' && (
            <div>
              <p>Unsaved changes will be lost.</p>
              <button onClick={proceed}>Leave</button>
              <button onClick={reset}>Stay</button>
            </div>
          )}
        </>
      )}
    </Block>
  )
}
```

### Custom UI Without Resolver (Promise Pattern)

Return a Promise from `shouldBlockFn` for integration with modal managers:

```tsx
useBlocker({
  shouldBlockFn: () => {
    if (!formIsDirty) return false

    return new Promise<boolean>((resolve) => {
      modals.open({
        title: 'Are you sure you want to leave?',
        children: (
          <div>
            <button onClick={() => { modals.closeAll(); resolve(false) }}>
              Yes, leave
            </button>
            <button onClick={() => { modals.closeAll(); resolve(true) }}>
              No, stay
            </button>
          </div>
        ),
        onClose: () => resolve(true),
      })
    })
  },
})
```

---

## Navigation Patterns

### Link Component

```tsx
// Absolute
<Link to="/about">About</Link>

// Dynamic with params
<Link to="/blog/post/$postId" params={{ postId: 'my-post' }}>Post</Link>

// Relative (requires from)
<Link from="/blog/post/$postId" to="../categories">Categories</Link>

// Current route reload
<Link to=".">Reload</Link>

// Parent route
<Link to="..">Go Back</Link>
```

### Active/Inactive Props

```tsx
<Link
  to="/blog/post/$postId"
  params={{ postId: 'my-post' }}
  activeProps={{ style: { fontWeight: 'bold' } }}
  activeOptions={{ exact: true }}
>
  Post
</Link>
```

`activeOptions`:
- `exact` (default `false`) -- only active on exact match
- `includeHash` (default `false`) -- include hash in matching
- `includeSearch` (default `true`) -- include search params in matching

### isActive via Children Function

```tsx
<Link to="/blog/post">
  {({ isActive }) => (
    <>
      <span>Blog</span>
      <Icon className={isActive ? 'active' : 'inactive'} />
    </>
  )}
</Link>
```

### useNavigate for Imperative Navigation

```tsx
function Component() {
  const navigate = useNavigate({ from: '/posts/$postId' })

  const handleSubmit = async () => {
    const { id } = await createPost()
    navigate({ to: '/posts/$postId', params: { postId: id } })
  }
}
```

### Navigate Component (Immediate Redirect)

```tsx
function Component() {
  return <Navigate to="/posts/$postId" params={{ postId: 'my-first-post' }} />
}
```

### useMatchRoute for Pending UI

```tsx
<Link to="/users">
  Users
  <MatchRoute to="/users" pending>
    <Spinner />
  </MatchRoute>
</Link>
```

---

## History Types

### Browser History (Default)

Standard HTML5 history API. No configuration needed.

```tsx
import { createBrowserHistory, createRouter } from '@tanstack/react-router'
const router = createRouter({ routeTree })
```

### Hash History

For environments without server-side URL rewriting.

```tsx
import { createHashHistory, createRouter } from '@tanstack/react-router'
const hashHistory = createHashHistory()
const router = createRouter({ routeTree, history: hashHistory })
```

### Memory History

For non-browser environments (testing, SSR, embedded).

```tsx
import { createMemoryHistory, createRouter } from '@tanstack/react-router'
const memoryHistory = createMemoryHistory({
  initialEntries: ['/'],
})
const router = createRouter({ routeTree, history: memoryHistory })
```

---

## Outlets

### Basic Outlet Usage

`<Outlet />` renders the next matching child route. If a route has no `component`, it renders `<Outlet />` automatically.

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div>
      <h1>My App</h1>
      <Outlet />
    </div>
  ),
})
```

---

See also: `api-components.md` (Link component props), `api-hooks.md` (useBlocker, useLinkProps), `patterns-params.md` (search params in links)
