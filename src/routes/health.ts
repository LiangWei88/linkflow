import type { Router, Request, Response } from 'express'
import express from 'express'

const router: Router = express.Router()

router.get('/', (req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

export { router as healthRoutes }
