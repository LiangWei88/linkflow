import type { Request, Response } from 'express'

export interface ApiError extends Error {
  statusCode?: number
}

export const errorHandler = (error: ApiError, req: Request, res: Response): void => {
  console.error('错误处理中间件:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  })

  const statusCode = error.statusCode || 500
  const message = error.message || '服务器内部错误'

  res.status(statusCode).json({
    success: false,
    error: message,
  })
}
