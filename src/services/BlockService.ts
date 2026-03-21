import { blockRepository } from '../repositories/BlockRepository'
import type { Block, BlockCreate, BlockUpdate } from '../types/block'

export class BlockService {
  // 创建新的 block
  createBlock(block: BlockCreate): Block {
    // 自动计算 blockOrder 值
    const parentId = block.parentId ?? null
    const maxOrder = blockRepository.getMaxOrder(block.docId, parentId)
    const newBlock = {
      ...block,
      parentId,
      blockOrder: block.blockOrder ?? maxOrder + 1,
    }

    return blockRepository.create(newBlock)
  }

  // 获取 block
  getBlock(id: string): Block | null {
    return blockRepository.getById(id)
  }

  // 获取文档的所有 blocks
  getBlocks(docId: string): Block[] {
    return blockRepository.getByDocId(docId)
  }

  // 更新 block
  updateBlock(id: string, updates: BlockUpdate): Block | null {
    return blockRepository.update(id, updates)
  }

  // 删除 block
  deleteBlock(id: string): boolean {
    return blockRepository.delete(id)
  }

  // 批量更新 blocks 的 blockOrder
  updateBlockOrders(_docId: string, blockIds: string[]): void {
    blockIds.forEach((blockId, index) => {
      blockRepository.update(blockId, { blockOrder: index })
    })
  }
}

export const blockService = new BlockService()
