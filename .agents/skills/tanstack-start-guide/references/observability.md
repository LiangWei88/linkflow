# TanStack Start Observability

## Partner: Sentry

```tsx
// Client
import * as Sentry from '@sentry/react'
Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.NODE_ENV })

// Server functions
import * as Sentry from '@sentry/node'
const serverFn = createServerFn().handler(async () => {
  try { return await riskyOp() }
  catch (error) { Sentry.captureException(error); throw error }
})
```

## Request Logger Middleware

```tsx
const requestLogger = createMiddleware().server(async ({ request, next }) => {
  const start = Date.now()
  const result = await next()
  console.log(`${request.method} ${request.url} - ${result.response.status} (${Date.now() - start}ms)`)
  return result
})
```

## Route Performance Monitoring

```tsx
// Client-side route timing
function RouteTimer() {
  useEffect(() => {
    const start = performance.now()
    return () => {
      console.log(`Route rendered in ${(performance.now() - start).toFixed(1)}ms`)
    }
  }, [])
  return null
}
```

## Health Check Endpoint

```tsx
export const Route = createFileRoute('/health')({
  server: {
    handlers: {
      GET: async () => Response.json({
        status: 'healthy', timestamp: new Date().toISOString(),
        uptime: process.uptime(), memory: process.memoryUsage(),
        database: await checkDatabase(),
      }),
    },
  },
})
```

## Performance Metrics Collection

```tsx
class MetricsCollector {
  private metrics = new Map<string, number[]>()
  recordTiming(name: string, duration: number) {
    if (!this.metrics.has(name)) this.metrics.set(name, [])
    this.metrics.get(name)!.push(duration)
  }
  getStats(name: string) {
    const timings = this.metrics.get(name) || []
    if (!timings.length) return null
    const sorted = timings.sort((a, b) => a - b)
    return {
      count: timings.length, avg: timings.reduce((a, b) => a + b, 0) / timings.length,
      p50: sorted[Math.floor(sorted.length * 0.5)], p95: sorted[Math.floor(sorted.length * 0.95)],
    }
  }
}
export const metrics = new MetricsCollector()
```

Expose via `/metrics` server route endpoint.

## Debug Headers (Development Only)

```tsx
const debugMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next()
  if (process.env.NODE_ENV === 'development') {
    result.response.headers.set('X-Debug-Timestamp', new Date().toISOString())
    result.response.headers.set('X-Debug-Node-Version', process.version)
  }
  return result
})
```

## Environment-Specific Logging

```tsx
const logger = createIsomorphicFn()
  .server((level: string, message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console[level](`[${new Date().toISOString()}] [${level.toUpperCase()}]`, message, data)
    } else {
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, data }))
    }
  })
  .client((level: string, message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') console[level](`[CLIENT]`, message, data)
  })
```

## New Relic Integration

**SSR:** Create Node integration on New Relic. Add `newrelic.js` config with `app_name`, `license_key`, `distributed_tracing: { enabled: true }`.

```tsx
// src/server.ts
import newrelic from 'newrelic'  // Must be FIRST import

const customHandler = defineHandlerCallback(async (ctx) => {
  const matches = ctx.router?.state?.matches ?? []
  const routeId = matches[matches.length - 1]?.routeId ?? new URL(ctx.request.url).pathname
  newrelic.setControllerName(routeId, ctx.request.method ?? 'GET')
  newrelic.addCustomAttributes({ 'route.id': routeId, 'http.method': ctx.request.method })
  return defaultStreamHandler(ctx)
})
```

Run with: `node -r newrelic .output/server/index.mjs`

**Server Functions/Routes:** Add middleware:

```tsx
const nrMiddleware = createMiddleware().server(async ({ request, next }) => {
  newrelic.setControllerName(new URL(request.url).pathname, request.method ?? 'GET')
  return await next()
})
// Apply via createStart({ requestMiddleware: [nrMiddleware] })
```

**SPA/Browser:** Create React integration on New Relic. Add script to root route's `head.scripts`.

## OpenTelemetry (Experimental)

```tsx
// instrumentation.ts — initialize BEFORE importing app
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
const sdk = new NodeSDK({ instrumentations: [getNodeAutoInstrumentations()] })
sdk.start()

// Tracing middleware
import { trace, SpanStatusCode } from '@opentelemetry/api'
const tracer = trace.getTracer('tanstack-start')

const tracingMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url)
  return tracer.startActiveSpan(`${request.method} ${url.pathname}`, async (span) => {
    span.setAttributes({ 'http.method': request.method, 'http.url': request.url })
    try {
      const result = await next()
      span.setAttribute('http.status_code', result.response.status)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.recordException(error); span.setStatus({ code: SpanStatusCode.ERROR }); throw error
    } finally { span.end() }
  })
})
```

First-class OpenTelemetry support is planned for automatic instrumentation.

## Other Tools

**APM:** DataDog, Honeycomb. **Error tracking:** Bugsnag, Rollbar. **Analytics:** PostHog, Mixpanel.

## Performance Monitoring Checklist

- Server function execution times
- Route loader performance
- Database query performance
- External API latency
- Memory usage patterns
- Error rates and types

## Security Considerations

- Never log sensitive data (passwords, tokens, PII)
- Use structured logging in production (JSON format)
- Implement log rotation for long-running servers
- Consider GDPR/CCPA compliance for collected metrics

## See Also

- [Middleware](api-middleware.md) — createMiddleware for instrumentation
- [Server & Client Entry](server-entry.md) — custom server entry for New Relic/OpenTelemetry integration
- [Deployment](deployment.md) — hosting-specific monitoring setup
- [Configuration](configuration.md) — environment variables for DSNs and keys
- [Troubleshooting](troubleshooting.md) — debugging production issues
