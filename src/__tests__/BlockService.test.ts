import fs from 'fs'
import path from 'path'

// 删除测试数据库文件
const testDbPath = path.resolve(process.cwd(), 'data/test_linkflow.db')
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath)
}

// 现在导入数据库相关模块
import { BlockService } from '../services/BlockService'
import { db } from '../db'

describe('BlockService', () => {
  let service: BlockService
  const testDocId = 'test-doc-1'

  beforeEach(() => {
    service = new BlockService()
    // 清空测试数据
    db.exec('DELETE FROM blocks')
  })

  afterAll(() => {
    // 清空测试数据
    db.exec('DELETE FROM blocks')
  })

  test('should create a new block with auto order', () => {
    const block1 = service.createBlock({
      docId: testDocId,
      content: 'Block 1',
    })

    const block2 = service.createBlock({
      docId: testDocId,
      content: 'Block 2',
    })

    expect(block1.blockOrder).toBe(0)
    expect(block2.blockOrder).toBe(1)
  })

  test('should get block by id', () => {
    const createdBlock = service.createBlock({
      docId: testDocId,
      content: 'Test block',
    })

    const retrievedBlock = service.getBlock(createdBlock.id)

    expect(retrievedBlock).toBeDefined()
    expect(retrievedBlock?.id).toBe(createdBlock.id)
  })

  test('should get blocks by docId', () => {
    service.createBlock({
      docId: testDocId,
      content: 'Block 1',
    })

    service.createBlock({
      docId: testDocId,
      content: 'Block 2',
    })

    const blocks = service.getBlocks(testDocId)

    expect(blocks).toHaveLength(2)
    expect(blocks[0].content).toBe('Block 1')
    expect(blocks[1].content).toBe('Block 2')
  })

  test('should update block', () => {
    const createdBlock = service.createBlock({
      docId: testDocId,
      content: 'Original content',
    })

    const updatedBlock = service.updateBlock(createdBlock.id, {
      content: 'Updated content',
    })

    expect(updatedBlock).toBeDefined()
    expect(updatedBlock?.content).toBe('Updated content')
  })

  test('should delete block', () => {
    const createdBlock = service.createBlock({
      docId: testDocId,
      content: 'Test block',
    })

    const result = service.deleteBlock(createdBlock.id)
    const retrievedBlock = service.getBlock(createdBlock.id)

    expect(result).toBe(true)
    expect(retrievedBlock).toBeNull()
  })

  test('should update block orders', () => {
    const block1 = service.createBlock({
      docId: testDocId,
      content: 'Block 1',
    })

    const block2 = service.createBlock({
      docId: testDocId,
      content: 'Block 2',
    })

    // 反转顺序
    service.updateBlockOrders(testDocId, [block2.id, block1.id])

    const blocks = service.getBlocks(testDocId)

    expect(blocks[0].id).toBe(block2.id)
    expect(blocks[1].id).toBe(block1.id)
  })
})
