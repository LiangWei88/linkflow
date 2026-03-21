# TanStack Start Server Routes

## Server Routes as API Endpoints

### Combined Route (Page + API)

```tsx
export const Route = createFileRoute('/hello')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        return Response.json({ message: `Hello, ${body.name}!` })
      },
    },
  },
  component: HelloComponent,  // Renders for GET (browser navigation)
})
```

### Dynamic Path Params

```ts
// routes/users/$id.ts
export const Route = createFileRoute('/users/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        return Response.json({ userId: params.id })
      },
    },
  },
})
```

Multiple dynamic params: `routes/users/$id/posts/$postId.ts` → `params.id` and `params.postId`.

### Wildcard/Splat Params

```ts
// routes/file/$.ts → matches /file/any/path/here
export const Route = createFileRoute('/file/$')({
  server: {
    handlers: {
      GET: async ({ params }) => new Response(`File: ${params._splat}`),
    },
  },
})
```

### Handling Request Bodies

```ts
// POST, PUT, PATCH, DELETE
POST: async ({ request }) => {
  const body = await request.json()      // JSON body
  // or: await request.text()            // Plain text
  // or: await request.formData()        // Form data
  return Response.json({ received: body })
}
```

### Responding with Status Codes

```ts
GET: async ({ params }) => {
  const user = await findUser(params.id)
  if (!user) return new Response('Not found', { status: 404 })
  return Response.json(user)
}
```

### Per-Handler Middleware

```tsx
export const Route = createFileRoute('/api/data')({
  server: {
    middleware: [authMiddleware],  // All handlers
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async ({ request }) => Response.json({ data: 'public' }),
        POST: {
          middleware: [validationMiddleware],  // POST only
          handler: async ({ request }) => {
            const body = await request.json()
            return Response.json({ created: true })
          },
        },
      }),
  },
})
```

### Unique Route Paths

Each route path can only have ONE handler file. These would conflict:
- `routes/users.index.ts`, `routes/users.ts`, `routes/users/index.ts`

### Escaped File Names for Custom Extensions

```ts
// routes/my-script[.]js.ts → serves /my-script.js
// routes/sitemap[.]xml.ts → serves /sitemap.xml
// routes/robots[.]txt.ts → serves /robots.txt
```

## See Also

- [Routing & Components](api-routing.md) — createFileRoute server option
- [Middleware](api-middleware.md) — createHandlers, per-handler middleware
- [Auth & Sessions](auth-sessions.md) — protecting API endpoints
- [Data Loading & Streaming](data-streaming.md) — data loading via server functions vs server routes
- [Deployment](deployment.md) — hosting server routes
