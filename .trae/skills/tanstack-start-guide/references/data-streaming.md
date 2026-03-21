# TanStack Start Data Loading & Streaming

## Data Loading Patterns

### Basic Loader

```tsx
export const Route = createFileRoute('/posts')({
  loader: async () => {
    const posts = await fetchPosts()
    return posts
  },
  component: () => {
    const posts = Route.useLoaderData()
    return posts.map(p => <div key={p.id}>{p.title}</div>)
  },
})
```

### Loader with Server Function (Secure)

```tsx
const getSecureData = createServerFn().handler(async () => {
  const secret = process.env.API_KEY  // Safe — server only
  return fetch(`https://api.com/data`, { headers: { Authorization: secret } })
})

export const Route = createFileRoute('/data')({
  loader: () => getSecureData(),  // Isomorphic call → server function handles security
})
```

### Loader with TanStack Query Integration

```tsx
import { queryOptions } from '@tanstack/react-query'

const postQueryOptions = (postId: string) =>
  queryOptions({
    queryKey: ['post', postId],
    queryFn: () => fetchPost(postId),
  })

export const Route = createFileRoute('/posts/$postId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(postQueryOptions(params.postId)),
})

function Post() {
  const { postId } = Route.useParams()
  const { data } = useQuery(postQueryOptions(postId))  // Uses cached loader data
}
```

### Cache Control

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => fetchPost(params.postId),
  staleTime: 10_000,      // Fresh for 10 seconds on client
  gcTime: 5 * 60_000,     // Keep in memory 5 minutes
  headers: () => ({
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  }),
})
```

### Invalidation After Mutation

```tsx
function AddPostForm() {
  const router = useRouter()

  const handleSubmit = async (data: PostData) => {
    await createPost({ data })
    router.invalidate()  // Re-runs all active loaders
  }
}
```

## Streaming Data

### Async Generator (Recommended)

```tsx
const streamMessages = createServerFn().handler(async function* () {
  for (const msg of messages) {
    await sleep(500)
    yield { content: msg }  // Typed chunks
  }
})

// Client consumption:
for await (const msg of await streamMessages()) {
  setMessages(prev => prev + msg.content)
}
```

### ReadableStream

```tsx
const streamFn = createServerFn().handler(async () => {
  return new ReadableStream<{ content: string }>({
    async start(controller) {
      for (const msg of messages) {
        controller.enqueue({ content: msg })
      }
      controller.close()
    },
  })
})
```

### Client-Side Streaming with React State

```tsx
function StreamChat() {
  const [message, setMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const handleStream = useCallback(async () => {
    setIsStreaming(true)
    setMessage('')
    for await (const chunk of await streamMessages()) {
      setMessage((prev) => prev + chunk.content)
    }
    setIsStreaming(false)
  }, [])

  return (
    <div>
      <button onClick={handleStream} disabled={isStreaming}>Stream</button>
      <p>{message}</p>
    </div>
  )
}
```

## See Also

- [Routing & Components](api-routing.md) — createFileRoute, route hooks
- [Server Functions](api-server-functions.md) — createServerFn, streaming, validation
- [Auth & Sessions](auth-sessions.md) — secure data loading with authentication
- [Prerendering & Caching](prerendering-caching.md) — ISR, cache headers, SSG
- [Troubleshooting](troubleshooting.md) — loader mistakes, server function issues
