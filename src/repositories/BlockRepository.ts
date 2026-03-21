import { db } from '../db';
import type { Block, BlockCreate, BlockUpdate } from '../types/block';

export class BlockRepository {
  // 创建新的 block
  create(block: BlockCreate): Block {
    const id = `block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const blockOrder = block.blockOrder ?? 0;
    const parentId = block.parentId ?? null;

    // 使用参数化查询来避免 SQL 注入和数据类型问题
    const stmt = db.prepare(`
      INSERT INTO blocks (id, docId, content, parentId, blockOrder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, block.docId, block.content, parentId, blockOrder, now, now);

    return {
      id,
      docId: block.docId,
      content: block.content,
      parentId,
      blockOrder: Number(blockOrder),
      createdAt: now,
      updatedAt: now,
    };
  }

  // 根据 ID 获取 block
  getById(id: string): Block | null {
    const stmt = db.prepare('SELECT * FROM blocks WHERE id = ?');
    const result = stmt.get(id);
    return result ? (result as Block) : null;
  }

  // 根据 docId 获取所有 blocks
  getByDocId(docId: string): Block[] {
    const stmt = db.prepare('SELECT * FROM blocks WHERE docId = ? ORDER BY parentId NULLS FIRST, blockOrder ASC');
    const results = stmt.all(docId);
    return results as Block[];
  }

  // 更新 block
  update(id: string, updates: BlockUpdate): Block | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const content = updates.content ?? existing.content;
    const parentId = updates.parentId ?? existing.parentId;
    const blockOrder = updates.blockOrder ?? existing.blockOrder;

    const stmt = db.prepare(`
      UPDATE blocks
      SET content = ?, parentId = ?, blockOrder = ?, updatedAt = ?
      WHERE id = ?
    `);

    stmt.run(content, parentId, blockOrder, now, id);

    return {
      ...existing,
      content,
      parentId,
      blockOrder,
      updatedAt: now,
    };
  }

  // 删除 block
  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM blocks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // 获取最大 blockOrder 值
  getMaxOrder(docId: string, parentId: string | null = null): number {
    let stmt;
    let result;
    
    if (parentId === null) {
      stmt = db.prepare('SELECT MAX(blockOrder) as maxOrder FROM blocks WHERE docId = ? AND parentId IS NULL');
      result = stmt.get(docId);
    } else {
      stmt = db.prepare('SELECT MAX(blockOrder) as maxOrder FROM blocks WHERE docId = ? AND parentId = ?');
      result = stmt.get(docId, parentId);
    }
    
    return (result as { maxOrder: number | null }).maxOrder ?? -1;
  }
}

export const blockRepository = new BlockRepository();
