---
name: sqlite-query
description: 编写 SQLite 查询、数据库操作、全文搜索时触发。包含查询安全、索引使用、事务管理和 FTS5 规范。
---

# sqlite-query

## 命令

无命令行工具，作为编码规范在编写 SQLite 相关代码时自动应用。

## 使用场景

- 编写 SQLite 查询语句
- 设计数据库表结构和索引
- 实现事务操作
- 配置全文搜索 (FTS5)
- 处理数据库迁移

## 输出解释

### 查询安全

所有查询必须使用**参数化语句**，禁止字符串拼接：

```typescript
// ✅ 正确
const blocks = db.prepare('SELECT * FROM blocks WHERE doc_id = ?').all(docId);

// ❌ 错误
const blocks = db.prepare(`SELECT * FROM blocks WHERE doc_id = '${docId}'`).all();
```

### 索引使用

- 查询 `blocks` 表时，必须使用 `doc_id` 或 `parent_id` 索引
- 反链查询必须限制结果数量（如 `LIMIT 20`）

```typescript
// ✅ 正确：使用索引 + 分页
const backlinks = db.prepare(
  'SELECT * FROM backlinks WHERE target_id = ? LIMIT 20'
).all(targetId);
```

### 事务管理

所有写操作必须使用**事务**，确保数据一致性：

```typescript
// ✅ 正确
db.exec('BEGIN TRANSACTION');
try {
  db.prepare('INSERT INTO blocks VALUES (?, ?, ?)').run(id, docId, content);
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  throw err;
}
```

### 全文搜索

所有内容搜索必须使用**FTS5 全文索引**：

```typescript
// ✅ 正确
const results = db.prepare(
  'SELECT * FROM blocks_fts WHERE content MATCH ?'
).all(keyword);
```

## 示例

### 完整的查询服务示例

```typescript
class BlockRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async findByDoc(docId: string): Promise<Block[]> {
    return this.db.prepare('SELECT * FROM blocks WHERE doc_id = ?').all(docId);
  }

  async searchContent(keyword: string): Promise<Block[]> {
    return this.db.prepare(
      'SELECT * FROM blocks_fts WHERE content MATCH ? LIMIT 50'
    ).all(keyword);
  }

  async insert(block: Block): Promise<void> {
    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.prepare(
        'INSERT INTO blocks (id, doc_id, content) VALUES (?, ?, ?)'
      ).run(block.id, block.docId, block.content);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}
```
