# TanStack Start SEO & LLMO

## SEO & Head Management

### Basic Meta Tags

```tsx
export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'My App - Home' },
      { name: 'description', content: 'Welcome to My App' },
    ],
  }),
})
```

### Dynamic Meta from Loader Data

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => fetchPost(params.postId),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData.title },
      { name: 'description', content: loaderData.excerpt },
      { property: 'og:title', content: loaderData.title },
      { property: 'og:description', content: loaderData.excerpt },
      { property: 'og:image', content: loaderData.coverImage },
      { property: 'og:type', content: 'article' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: loaderData.title },
      { name: 'twitter:description', content: loaderData.excerpt },
      { name: 'twitter:image', content: loaderData.coverImage },
    ],
    links: [{ rel: 'canonical', href: `https://myapp.com/posts/${loaderData.id}` }],
  }),
})
```

### Structured Data (JSON-LD)

```tsx
head: ({ loaderData }) => ({
  scripts: [{
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: loaderData.title,
      author: { '@type': 'Person', name: loaderData.author },
      datePublished: loaderData.publishedAt,
    }),
  }],
})
```

### Dynamic Sitemap

```ts
// routes/sitemap[.]xml.ts
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const posts = await fetchAllPosts()
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${posts.map(post => `<url><loc>https://myapp.com/posts/${post.id}</loc><lastmod>${post.updatedAt}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('')}
</urlset>`
        return new Response(sitemap, { headers: { 'Content-Type': 'application/xml' } })
      },
    },
  },
})
```

### robots.txt

**Static** — place in `public/robots.txt`:

```txt
User-agent: *
Allow: /

Sitemap: https://myapp.com/sitemap.xml
```

**Dynamic** — server route for environment-specific rules:

```ts
// routes/robots[.]txt.ts
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => new Response(
        `User-agent: *\nAllow: /\n\nSitemap: https://myapp.com/sitemap.xml`,
        { headers: { 'Content-Type': 'text/plain' } },
      ),
    },
  },
})
```

### LLMO (AI Optimization)

LLM Optimization (LLMO) / AI Optimization (AIO) — structuring content so AI systems can accurately cite and recommend it.

| Aspect | SEO | LLMO |
|--------|-----|------|
| Goal | Rank in search results | Be cited/recommended by AI |
| Audience | Search engine crawlers | LLM training & retrieval systems |
| Key signals | Links, keywords, page speed | Structured data, clarity, authority |

**Structured Data for AI** — schema.org vocabulary helps AI understand content:

```tsx
// Article schema
head: ({ loaderData }) => ({
  scripts: [{
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article',
      headline: loaderData.title, author: { '@type': 'Person', name: loaderData.author },
      publisher: { '@type': 'Organization', name: 'My Company',
        logo: { '@type': 'ImageObject', url: 'https://myapp.com/logo.png' } },
      datePublished: loaderData.publishedAt, dateModified: loaderData.updatedAt,
    }),
  }],
})

// Product schema
scripts: [{ type: 'application/ld+json', children: JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Product',
  name: product.name, brand: { '@type': 'Brand', name: product.brand },
  offers: { '@type': 'Offer', price: product.price, priceCurrency: 'USD',
    availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  aggregateRating: product.rating ? { '@type': 'AggregateRating',
    ratingValue: product.rating, reviewCount: product.reviewCount } : undefined,
}) }]

// FAQ schema (AI systems often extract Q&A pairs)
scripts: [{ type: 'application/ld+json', children: JSON.stringify({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
    '@type': 'Question', name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
}) }]
```

**Organization schema (root route):**

```tsx
// __root.tsx
head: () => ({
  scripts: [{
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: 'My App', url: 'https://myapp.com',
      publisher: { '@type': 'Organization', name: 'My Company',
        logo: { '@type': 'ImageObject', url: 'https://myapp.com/logo.png' } },
      sameAs: ['https://twitter.com/myapp', 'https://github.com/myapp'],
    }),
  }],
})
```

**llms.txt** — machine-readable file for AI assistants:

```ts
// routes/llms[.]txt.ts
export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => new Response(
        `# My App\n> Description\n## Docs\n- https://myapp.com/docs/getting-started\n## Key Facts\n- Built with TanStack Start`,
        { headers: { 'Content-Type': 'text/plain' } },
      ),
    },
  },
})
```

**Machine-readable API endpoints:**

```ts
// routes/api/products.ts
export const Route = createFileRoute('/api/products')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const category = url.searchParams.get('category')
        const products = await fetchProducts({ category })
        return Response.json({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: products.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: { '@type': 'Product', name: product.name, description: product.description,
              url: `https://myapp.com/products/${product.id}` },
          })),
        })
      },
    },
  },
})
```

**Content best practices for LLMO:**

**Clear, factual statements** — AI systems extract factual claims. Make key info explicit:

```tsx
function ProductDetails({ product }) {
  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.name} is a {product.category} made by {product.brand}. It costs ${product.price} and is available in {product.colors.join(', ')}.</p>
    </article>
  )
}
```

**Hierarchical structure** — use semantic HTML with proper heading hierarchy:

```tsx
function DocumentationPage() {
  return (
    <article>
      <h1>Getting Started with TanStack Start</h1>
      <section>
        <h2>Installation</h2>
        <p>Install TanStack Start using npm...</p>
        <h3>Prerequisites</h3>
        <p>You'll need Node.js 18 or later...</p>
      </section>
      <section>
        <h2>Configuration</h2>
        <p>Configure your app in vite.config.ts...</p>
      </section>
    </article>
  )
}
```

**Authoritative attribution** — include author information for authority signals:

```tsx
export const Route = createFileRoute('/posts/$postId')({
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData.post.title },
      { name: 'author', content: loaderData.post.author.name },
      { property: 'article:author', content: loaderData.post.author.profileUrl },
      { property: 'article:published_time', content: loaderData.post.publishedAt },
    ],
  }),
})
```

**Monitoring:** Test with AI assistants, validate structured data with schema.org validator, monitor AI search engines.

### SEO Best Practices

- **Performance:** Code-splitting, streaming SSR, preloading critical assets
- **Content:** Quality content, clear site structure, descriptive URLs, internal linking
- **Test with:** Google Search Console, Rich Results Test, OpenGraph Debugger, DevTools
- **Track rankings:** Nozzle.io for search position monitoring

## See Also

- [Routing & Components](api-routing.md) — head management, HeadContent, Scripts
- [Prerendering & Caching](prerendering-caching.md) — SSG for SEO, ISR cache headers
- [Server Routes](server-routes.md) — dynamic sitemap and robots.txt endpoints
- [Configuration](configuration.md) — sitemap generation config
