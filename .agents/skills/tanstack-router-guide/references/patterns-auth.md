# Patterns: Authentication & Context

Authentication, role-based access control, and router context patterns for TanStack Router. All examples use file-based routing with TypeScript.

---

## Authentication Patterns

### Basic Auth with beforeLoad

Use a pathless layout route prefixed with `_` to wrap protected routes. Check auth state in `beforeLoad` and throw `redirect()` if unauthenticated.

```tsx
// src/routes/_auth.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: () => <Outlet />,
})
```

Any route prefixed with `_auth.` is now protected:

```tsx
// src/routes/_auth.dashboard.tsx - protected, URL: /dashboard
export const Route = createFileRoute('/_auth/dashboard')({
  component: () => <div>Protected Dashboard</div>,
})
```

### Handling Auth Check Failures

Wrap async auth checks in try/catch and use `isRedirect()` to distinguish intentional redirects from errors:

```tsx
import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ location }) => {
    try {
      const user = await verifySession()
      if (!user) {
        throw redirect({ to: '/login', search: { redirect: location.href } })
      }
      return { user }
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
})
```

### Post-Login Redirect

After successful login, redirect back to the original page using `router.history.push`:

```tsx
const { redirect } = Route.useSearch()
const handleLogin = async () => {
  await auth.login(username, password)
  router.history.push(redirect)
}
```

### Non-Redirected Authentication

Show a login form in-place instead of redirecting by conditionally rendering `<Outlet />`:

```tsx
export const Route = createFileRoute('/_authenticated')({
  component: () => {
    if (!isAuthenticated()) {
      return <Login />
    }
    return <Outlet />
  },
})
```

### Auth with React Context

Pass auth state to router via context. The hook is called in React-land, then injected into the router.

```tsx
// src/routes/__root.tsx
interface MyRouterContext {
  auth: AuthState
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => <Outlet />,
})

// src/router.tsx
const router = createRouter({
  routeTree,
  context: { auth: undefined! },
})

// src/App.tsx
function InnerApp() {
  const auth = useAuth()
  return <RouterProvider router={router} context={{ auth }} />
}

function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  )
}
```

---

## Role-Based Access Control (RBAC)

### Auth Context with RBAC Helpers

Extend the auth context with role and permission helpers, then gate routes with `beforeLoad`.

```tsx
// Auth context with RBAC helpers
interface AuthState {
  isAuthenticated: boolean
  user: { id: string; roles: string[]; permissions: string[] } | null
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
}
```

### Admin-Only Layout Route

```tsx
// src/routes/_authenticated/_admin.tsx
export const Route = createFileRoute('/_authenticated/_admin')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.hasRole('admin')) {
      throw redirect({
        to: '/unauthorized',
        search: { redirect: location.href },
      })
    }
  },
  component: () => <Outlet />,
})
```

### Multiple-Role Access

```tsx
// src/routes/_authenticated/_moderator.tsx
export const Route = createFileRoute('/_authenticated/_moderator')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.hasAnyRole(['admin', 'moderator'])) {
      throw redirect({
        to: '/unauthorized',
        search: { redirect: location.href, reason: 'insufficient_role' },
      })
    }
  },
  component: () => <Outlet />,
})
```

### Permission-Based Route

```tsx
export const Route = createFileRoute('/_authenticated/_users')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.hasAnyPermission(['users:read', 'users:write'])) {
      throw redirect({
        to: '/unauthorized',
        search: { redirect: location.href, reason: 'insufficient_permissions' },
      })
    }
  },
  component: () => <Outlet />,
})
```

### Permission Guard Component

For component-level permission checks:

```tsx
function PermissionGuard({
  children,
  roles = [],
  permissions = [],
  requireAll = false,
  fallback = null,
}: {
  children: React.ReactNode
  roles?: string[]
  permissions?: string[]
  requireAll?: boolean
  fallback?: React.ReactNode
}) {
  const { hasRole, hasAnyRole, hasPermission, hasAnyPermission } = useAuth()

  const hasRequiredRoles =
    roles.length === 0 ||
    (requireAll ? roles.every((r) => hasRole(r)) : hasAnyRole(roles))

  const hasRequiredPermissions =
    permissions.length === 0 ||
    (requireAll
      ? permissions.every((p) => hasPermission(p))
      : hasAnyPermission(permissions))

  if (hasRequiredRoles && hasRequiredPermissions) return <>{children}</>
  return <>{fallback}</>
}

// Usage
<PermissionGuard roles={['admin']} fallback={<p>Admin only</p>}>
  <AdminPanel />
</PermissionGuard>
```

### Role Hierarchy

Implement implicit permissions via role inheritance:

```tsx
const roleHierarchy: Record<string, string[]> = {
  admin: ['admin', 'moderator', 'user'],
  moderator: ['moderator', 'user'],
  user: ['user'],
}

const hasRole = (requiredRole: string) => {
  const userRoles = user?.roles || []
  return userRoles.some((userRole) =>
    roleHierarchy[userRole]?.includes(requiredRole),
  )
}
```

---

## Router Context

### Typed Router Context

Use `createRootRouteWithContext` to define the root context type. All child routes inherit it.

```tsx
import { createRootRouteWithContext, createRouter } from '@tanstack/react-router'

interface MyRouterContext {
  queryClient: QueryClient
  user: User
}

const rootRoute = createRootRouteWithContext<MyRouterContext>()({
  component: App,
})

const router = createRouter({
  routeTree,
  context: { queryClient, user },
})
```

### Dependency Injection via Context

```tsx
// Inject a function
const router = createRouter({
  routeTree,
  context: { fetchTodosByUserId },
})

// Use in loader
export const Route = createFileRoute('/todos')({
  loader: ({ context }) => context.fetchTodosByUserId(context.user.id),
})
```

### Modifying Context in beforeLoad

Return an object from `beforeLoad` to merge additional context for the current route and all children.

```tsx
export const Route = createFileRoute('/todos')({
  beforeLoad: () => ({
    bar: true,
  }),
  loader: ({ context }) => {
    context.foo // from parent
    context.bar // from this route's beforeLoad
  },
})
```

### Invalidating Context

Call `router.invalidate()` to recompute context when the source data changes.

```tsx
function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      router.invalidate()
    })
    return unsubscribe
  }, [])

  return user
}
```

### Using React Hooks in Context

Hooks cannot be called in `beforeLoad`/`loader`. Instead, call the hook before `<RouterProvider>` and pass the value via context.

```tsx
function App() {
  const networkStrength = useNetworkStrength()
  return <RouterProvider router={router} context={{ networkStrength }} />
}

// Then in routes:
export const Route = createFileRoute('/posts')({
  loader: ({ context }) => {
    if (context.networkStrength === 'STRONG') {
      // fetch high-res data
    }
  },
})
```

### Processing Accumulated Context (Breadcrumbs)

Each route's isolated context is stored on its match, allowing accumulation patterns.

```tsx
export const Route = createRootRoute({
  component: () => {
    const matches = useRouterState({ select: (s) => s.matches })

    const breadcrumbs = matches
      .filter((match) => match.context.getTitle)
      .map(({ pathname, context }) => ({
        title: context.getTitle(),
        path: pathname,
      }))

    return <Breadcrumbs items={breadcrumbs} />
  },
})
```

---

See also: `patterns-data.md` (data loading with context), `patterns-links-blocking.md` (navigation blocking), `config-router-options.md` (router context option)
