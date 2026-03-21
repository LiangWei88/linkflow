import type { Router, Request, Response } from 'express'
import express from 'express'
import { blockService } from '../services/BlockService'

const router: Router = express.Router()

router.get('/:docId', (req: Request, res: Response): void => {
  try {
    const { docId } = req.params
    const blocks = blockService.getBlocks(docId)
    res.json({ success: true, data: blocks })
  } catch (error) {
    console.error('获取 blocks 失败:', error)
    res.status(500).json({ success: false, error: '获取数据失败' })
  }
})

router.get('/block/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const block = blockService.getBlock(id)
    if (block) {
      res.json({ success: true, data: block })
    } else {
      res.status(404).json({ success: false, error: 'Block 不存在' })
    }
  } catch (error) {
    console.error('获取 block 失败:', error)
    res.status(500).json({ success: false, error: '获取数据失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    console.log('收到创建 block 请求:', req.body)
    const { docId, content, blockOrder } = req.body
    const block = blockService.createBlock({ docId, content, blockOrder })
    console.log('创建 block 成功:', block)
    res.json({ success: true, data: block })
  } catch (error) {
    console.error('创建 block 失败:', error)
    res.status(500).json({ success: false, error: '创建失败' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const updates = req.body
    const block = blockService.updateBlock(id, updates)
    if (block) {
      res.json({ success: true, data: block })
    } else {
      res.status(404).json({ success: false, error: 'Block 不存在' })
    }
  } catch (error) {
    console.error('更新 block 失败:', error)
    res.status(500).json({ success: false, error: '更新失败' })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const result = blockService.deleteBlock(id)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('删除 block 失败:', error)
    res.status(500).json({ success: false, error: '删除失败' })
  }
})

export { router as blockRoutes }
