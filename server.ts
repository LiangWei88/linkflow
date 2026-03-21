import express from 'express'
import cors from 'cors'
import { blockRoutes } from './src/routes/blocks'
import { healthRoutes } from './src/routes/health'
import { errorHandler } from './src/middleware/errorHandler'

const app = express()
const PORT = process.env.PORT || 3002

app.use(cors())
app.use(express.json())

app.use(express.urlencoded({ extended: true }))

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
})

app.use('/api/health', healthRoutes)
app.use('/api/blocks', blockRoutes)

app.use(errorHandler)

app
  .listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
  .on('error', (error) => {
    console.error('服务器启动失败:', error)
    process.exit(1)
  })

process.on('uncaughtException', (error) => {
  console.error('未处理的异常:', error)
})

process.on('unhandledRejection', (error) => {
  console.error('未处理的 Promise 拒绝:', error)
})
