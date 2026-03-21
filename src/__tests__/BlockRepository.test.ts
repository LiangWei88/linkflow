import { BlockRepository } from '../repositories/BlockRepository';
import { db } from '../db';

describe('BlockRepository', () => {
  let repository: BlockRepository;
  const testDocId = 'test-doc-1';

  beforeEach(() => {
    repository = new BlockRepository();
    // 清空测试数据
    db.exec('DELETE FROM blocks');
  });

  afterAll(() => {
    // 清空测试数据
    db.exec('DELETE FROM blocks');
  });

  test('should create a new block', () => {
    const block = repository.create({
      docId: testDocId,
      content: 'Test block content',
    });

    expect(block).toBeDefined();
    expect(block.id).toBeDefined();
    expect(block.docId).toBe(testDocId);
    expect(block.content).toBe('Test block content');
    expect(block.blockOrder).toBe(0);
  });

  test('should get block by id', () => {
    const createdBlock = repository.create({
      docId: testDocId,
      content: 'Test block content',
    });

    const retrievedBlock = repository.getById(createdBlock.id);

    expect(retrievedBlock).toBeDefined();
    expect(retrievedBlock?.id).toBe(createdBlock.id);
  });

  test('should get blocks by docId', () => {
    repository.create({
      docId: testDocId,
      content: 'Block 1',
      blockOrder: 0,
    });

    repository.create({
      docId: testDocId,
      content: 'Block 2',
      blockOrder: 1,
    });

    const blocks = repository.getByDocId(testDocId);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].content).toBe('Block 1');
    expect(blocks[1].content).toBe('Block 2');
  });

  test('should update block', () => {
    const createdBlock = repository.create({
      docId: testDocId,
      content: 'Original content',
    });

    const updatedBlock = repository.update(createdBlock.id, {
      content: 'Updated content',
    });

    expect(updatedBlock).toBeDefined();
    expect(updatedBlock?.content).toBe('Updated content');
  });

  test('should delete block', () => {
    const createdBlock = repository.create({
      docId: testDocId,
      content: 'Test block',
    });

    const result = repository.delete(createdBlock.id);
    const retrievedBlock = repository.getById(createdBlock.id);

    expect(result).toBe(true);
    expect(retrievedBlock).toBeNull();
  });

  test('should get max order', () => {
    repository.create({
      docId: testDocId,
      content: 'Block 1',
      blockOrder: 0,
    });

    repository.create({
      docId: testDocId,
      content: 'Block 2',
      blockOrder: 1,
    });

    const maxOrder = repository.getMaxOrder(testDocId);

    expect(maxOrder).toBe(1);
  });
});
