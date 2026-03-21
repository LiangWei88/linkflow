# TanStack Start API — Server Functions

## createServerFn(options?)

Creates a server function. Options: `{ method: 'GET' | 'POST' }` (default: GET).

```tsx
import { createServerFn } from '@tanstack/react-start'

const myFn = createServerFn({ method: 'POST' })
  .inputValidator(validatorFnOrSchema)   // Validate input
  .middleware([middleware1, middleware2])   // Add middleware
  .handler(async ({ data, context }) => {
    // data: validated input
    // context: from middleware chain
    return result  // Serialized to client
  })

// Calling:
await myFn({ data: inputData })
await myFn({ data: inputData, headers: { 'X-Custom': 'value' } })
```

**Input validation patterns:**

```tsx
// Inline validator
.inputValidator((data: { name: string }) => data)

// Zod schema (direct)
.inputValidator(z.object({ name: z.string() }))

// Zod with adapter
import { zodValidator } from '@tanstack/zod-adapter'
.inputValidator(zodValidator(z.object({ name: z.string() })))

// FormData
.inputValidator((data) => {
  if (!(data instanceof FormData)) throw new Error('Expected FormData')
  return { name: data.get('name')?.toString() || '' }
})
```

**Streaming (ReadableStream):**

```tsx
const streamFn = createServerFn().handler(async () => {
  return new ReadableStream<{ content: string }>({
    async start(controller) {
      controller.enqueue({ content: 'chunk1' })
      controller.close()
    },
  })
})
```

**Streaming (async generator):**

```tsx
const streamFn = createServerFn().handler(async function* () {
  yield { content: 'chunk1' }
  yield { content: 'chunk2' }
})
```

**Client-side ReadableStream consumption:**

```tsx
function StreamComponent() {
  const [message, setMessage] = useState('')

  const handleStream = useCallback(async () => {
    const response = await streamFn()
    const reader = response.getReader()
    let done = false
    while (!done) {
      const { value, done: isDone } = await reader.read()  // value: Message | undefined
      done = isDone
      if (value) setMessage((prev) => prev + value.content)
    }
  }, [])

  return <div>{message}</div>
}
```

### Progressive Enhancement

Server functions expose a `.url` property for use with native HTML forms (works without JavaScript):

```tsx
<form method="POST" action={createPost.url}>
  <input name="title" />
  <button type="submit">Create</button>
</form>
```

### Raw Response Returns

Server functions can return `Response` objects directly for binary data or custom content types:

```tsx
const downloadFile = createServerFn().handler(async () => {
  const data = await fs.readFile('report.pdf')
  return new Response(data, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="report.pdf"' },
  })
})
```

### Request Cancellation

Server functions support `AbortSignal` for cancelling long-running operations when the client navigates away:

```tsx
const longRunningFn = createServerFn().handler(async ({ signal }) => {
  for (const item of items) {
    if (signal?.aborted) throw new Error('Aborted')
    await processItem(item)
  }
})
```

### Server Context Utilities

All imported from `@tanstack/react-start/server`:

```tsx
import {
  getRequest,            // Get full Request object
  getRequestHeader,      // getRequestHeader('Authorization')
  setResponseHeader,     // setResponseHeader('X-Custom', 'value')
  setResponseHeaders,    // setResponseHeaders(new Headers({...}))
  setResponseStatus,     // setResponseStatus(201)
  getCookie,             // getCookie('name')
  setCookie,             // setCookie('name', 'value', options)
} from '@tanstack/react-start/server'
```

### useSession

```tsx
import { useSession } from '@tanstack/react-start/server'

const session = await useSession<SessionData>({
  password: process.env.SESSION_SECRET!,  // 32+ chars
  name: 'app-session',
  cookie: { secure: true, httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 },
})

session.data          // Read session data
await session.update({ userId: '123' })  // Update session
await session.clear()                     // Clear session
```

## Environment Functions

```tsx
import {
  createIsomorphicFn,    // Different impl per environment
  createServerOnlyFn,    // Throws on client
  createClientOnlyFn,    // Throws on server
} from '@tanstack/react-start'

const getEnv = createIsomorphicFn()
  .server(() => process.platform)
  .client(() => navigator.userAgent)

const getSecret = createServerOnlyFn(() => process.env.SECRET)
const saveLocal = createClientOnlyFn((k: string, v: any) => localStorage.setItem(k, JSON.stringify(v)))
```

**Partial implementation:** If only `.server()` or `.client()` is provided, the missing side returns `undefined` (no-op). Both sides omitted also returns `undefined`.

Runtime errors: `createServerOnlyFn()` throws `"createServerOnlyFn() functions can only be called on the server!"` on client. `createClientOnlyFn()` throws the inverse on server.

### useServerFn Hook

Wraps a server function for use inside React components with React Query or similar patterns:

```tsx
import { useServerFn } from '@tanstack/react-start'

function PostList() {
  const getPosts = useServerFn(getServerPosts)

  const { data } = useQuery({
    queryKey: ['posts'],
    queryFn: () => getPosts(),
  })
}
```

## See Also

- [Routing & Components](api-routing.md) — createFileRoute, route hooks, components, navigation
- [Middleware](api-middleware.md) — createMiddleware, createStart, custom fetch, header merging
- [Auth & Sessions](auth-sessions.md) — authentication middleware, session management
- [Data Loading & Streaming](data-streaming.md) — loader patterns, streaming with server functions
- [Troubleshooting](troubleshooting.md) — server function issues, debugging
