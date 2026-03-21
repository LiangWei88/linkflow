# TanStack Start Authentication & Sessions

## Authentication Overview

**Authentication** = Who is the user? **Authorization** = What can they do?

### Architecture

- **Server-side (secure):** Session storage, credential verification, database ops, token generation
- **Client-side (public):** Auth state management, route protection logic, login/logout UI
- **Isomorphic (both):** Route loaders checking auth state, shared validation

### Session Management Patterns

- **HTTP-Only Cookies (Recommended):** Most secure, automatic browser handling, built-in CSRF protection with `sameSite`
- **JWT Tokens:** Stateless, good for API-first apps, requires careful XSS handling, use refresh token rotation
- **Server-Side Sessions:** Centralized control, easy revocation, requires session storage (database/Redis)

### Route Protection Architecture

- **Layout Route Pattern (Recommended):** Protect entire route subtrees via pathless layout `_authed.tsx`
- **Component-Level Protection:** Conditional rendering, more granular control
- **Server Function Guards:** Server-side validation before sensitive operations

### Authentication Options

**Partner solutions:** Clerk (UI components, social logins, MFA, organizations), WorkOS (SSO/SAML, directory sync, enterprise MFA, compliance-ready).

**Open source:** Better Auth (TypeScript-first), Auth.js (formerly NextAuth.js).

**Hosted services:** Supabase Auth, Auth0, Firebase Auth.

### Auth State Management Patterns

- **Server-Driven (Recommended):** Auth state sourced from server on each request. Works with SSR, most secure.
- **Context-Based:** For third-party providers (Auth0, Firebase). Use `AuthProvider`/`useAuth()` context. Requires client-server synchronization.
- **Hybrid:** Initial state from server, client-side updates, periodic server validation.

### Auth Context (for Third-Party Providers)

```tsx
import { createContext, useContext, type ReactNode } from 'react'
import { useServerFn } from '@tanstack/react-start'

type AuthContext = { user: User | null; login: (data: LoginData) => Promise<void>; logout: () => Promise<void> }

const AuthContext = createContext<AuthContext | null>(null)
export const useAuth = () => useContext(AuthContext)!

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const login = useServerFn(loginFn)
  const logout = useServerFn(logoutFn)
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}
```

### Decision Guide

- **Partner solutions:** Focus on core business, enterprise features (SSO, compliance), managed security
- **OSS solutions:** Community-driven, specific customizations, avoid vendor lock-in
- **DIY:** Complete control, custom security requirements, full data ownership

**Security checklist:** HTTPS in production, HTTP-only cookies, validate all inputs on server, keep secrets in server-only functions, implement rate limiting, use CSRF protection.

## Authentication (DIY Implementation)

### Session-Based Auth (Recommended)

```tsx
// utils/session.ts
import { useSession } from '@tanstack/react-start/server'

type SessionData = { userId?: string; email?: string; role?: string }

export function useAppSession() {
  return useSession<SessionData>({
    password: process.env.SESSION_SECRET!,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    },
  })
}
```

```tsx
// server/auth.ts
import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const user = await authenticateUser(data.email, data.password)
    if (!user) return { error: 'Invalid credentials' }
    const session = await useAppSession()
    await session.update({ userId: user.id, email: user.email })
    throw redirect({ to: '/dashboard' })
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  await session.clear()
  throw redirect({ to: '/' })
})

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await useAppSession()
  if (!session.data.userId) return null
  return await getUserById(session.data.userId)
})
```

### Registration

```tsx
export const registerFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ email: z.string().email(), password: z.string().min(8) }))
  .handler(async ({ data }) => {
    const existing = await getUserByEmail(data.email)
    if (existing) return { error: 'Email already exists' }
    const hashedPassword = await bcrypt.hash(data.password, 12)
    const user = await createUser({ email: data.email, password: hashedPassword })
    const session = await useAppSession()
    await session.update({ userId: user.id })
    throw redirect({ to: '/dashboard' })
  })
```

### Route Protection with Layout Routes

```tsx
// routes/_authed.tsx (pathless layout — protects all child routes)
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
    return { user }  // Available to all child routes via useRouteContext()
  },
})
```

```tsx
// routes/_authed/dashboard.tsx
export const Route = createFileRoute('/_authed/dashboard')({
  component: () => {
    const { user } = Route.useRouteContext()
    return <h1>Welcome, {user.email}!</h1>
  },
})
```

### Role-Based Access Control

```tsx
// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = { USER: 0, MODERATOR: 1, ADMIN: 2 } as const

function hasPermission(userRole: keyof typeof ROLE_HIERARCHY, requiredRole: keyof typeof ROLE_HIERARCHY) {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export const Route = createFileRoute('/_authed/admin/')({
  beforeLoad: async ({ context }) => {
    if (!hasPermission(context.user.role, 'ADMIN')) throw redirect({ to: '/unauthorized' })
  },
})
```

### Social Authentication (OAuth)

```tsx
export const authProviders = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    redirectUri: `${process.env.APP_URL}/auth/google/callback`,
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    redirectUri: `${process.env.APP_URL}/auth/github/callback`,
  },
}

export const initiateOAuthFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { provider: 'google' | 'github' }) => data)
  .handler(async ({ data }) => {
    const provider = authProviders[data.provider]
    const state = generateRandomState()
    const session = await useAppSession()
    await session.update({ oauthState: state })  // CSRF protection
    const authUrl = generateOAuthUrl(provider, state)
    throw redirect({ href: authUrl })
  })
```

### Password Reset Flow

```tsx
export const requestPasswordResetFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const user = await getUserByEmail(data.email)
    if (!user) return { success: true }  // Don't reveal if email exists
    const token = generateSecureToken()
    const expires = new Date(Date.now() + 60 * 60 * 1000)  // 1 hour
    await savePasswordResetToken(user.id, token, expires)
    await sendPasswordResetEmail(user.email, token)
    return { success: true }
  })

export const resetPasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; newPassword: string }) => data)
  .handler(async ({ data }) => {
    const resetToken = await getPasswordResetToken(data.token)
    if (!resetToken || resetToken.expires < new Date()) {
      return { error: 'Invalid or expired token' }
    }
    const hashedPassword = await bcrypt.hash(data.newPassword, 12)
    await updateUserPassword(resetToken.userId, hashedPassword)
    await deletePasswordResetToken(data.token)
    return { success: true }
  })
```

### Rate Limiting

```tsx
// Simple in-memory rate limiting (use Redis in production)
const loginAttempts = new Map<string, { count: number; resetTime: number }>()

export const rateLimitLogin = (ip: string): boolean => {
  const now = Date.now()
  const attempts = loginAttempts.get(ip)
  if (!attempts || now > attempts.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + 15 * 60 * 1000 })  // 15 min
    return true
  }
  if (attempts.count >= 5) return false  // Too many attempts
  attempts.count++
  return true
}
```

### Remember Me

```tsx
export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string; rememberMe?: boolean }) => data)
  .handler(async ({ data }) => {
    const user = await authenticateUser(data.email, data.password)
    if (!user) return { error: 'Invalid credentials' }
    const session = await useAppSession()
    await session.update(
      { userId: user.id },
      { maxAge: data.rememberMe ? 30 * 24 * 60 * 60 : undefined },  // 30 days vs session
    )
    return { success: true }
  })
```

### Loading States

```tsx
function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const login = useServerFn(loginFn)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const formData = new FormData(e.currentTarget)
      await login({ data: { email: formData.get('email') as string, password: formData.get('password') as string } })
    } catch (err) {
      setError('Invalid credentials')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p>{error}</p>}
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Login'}</button>
    </form>
  )
}
```

### Auth Providers

Partner solutions: **Clerk**, **WorkOS**. Open source: **Better Auth**, **Auth.js**. Hosted: **Supabase Auth**, **Auth0**, **Firebase Auth**.

## Testing Authentication

### Unit Testing Server Functions

```tsx
import { describe, it, expect } from 'vitest'

describe('Authentication', () => {
  it('should login with valid credentials', async () => {
    const result = await loginFn({
      data: { email: 'test@example.com', password: 'password123' },
    })
    expect(result.error).toBeUndefined()
  })

  it('should reject invalid credentials', async () => {
    const result = await loginFn({
      data: { email: 'test@example.com', password: 'wrong' },
    })
    expect(result.error).toBe('Invalid credentials')
  })
})
```

### Integration Testing

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'

describe('Auth Flow', () => {
  it('should redirect to login when accessing protected route', async () => {
    const history = createMemoryHistory()
    history.push('/dashboard')
    render(<RouterProvider router={router} history={history} />)
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })
})
```

## See Also

- [Data Loading & Streaming](data-streaming.md) — loader patterns, cache control
- [Server Routes](server-routes.md) — API endpoints with middleware
- [Troubleshooting](troubleshooting.md) — common auth-related issues
- [Server Functions](api-server-functions.md) — useSession, createServerFn, server context
- [Middleware](api-middleware.md) — createMiddleware, authentication middleware patterns
