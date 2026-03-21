export const createTables = `
  -- blocks 表：存储笔记块
  CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    docId TEXT NOT NULL,
    content TEXT NOT NULL,
    parentId TEXT NULL,
    blockOrder INTEGER NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- 创建索引
  CREATE INDEX IF NOT EXISTS idx_blocks_docId ON blocks(docId);
  CREATE INDEX IF NOT EXISTS idx_blocks_order ON blocks(docId, parentId, blockOrder);
  CREATE INDEX IF NOT EXISTS idx_blocks_parent ON blocks(parentId);

  -- backlinks 表：存储双向链接
  CREATE TABLE IF NOT EXISTS backlinks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sourceBlockId TEXT NOT NULL,
    targetBlockId TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sourceBlockId, targetBlockId),
    FOREIGN KEY(sourceBlockId) REFERENCES blocks(id) ON DELETE CASCADE,
    FOREIGN KEY(targetBlockId) REFERENCES blocks(id) ON DELETE CASCADE
  );

  -- 创建索引
  CREATE INDEX IF NOT EXISTS idx_backlinks_source ON backlinks(sourceBlockId);
  CREATE INDEX IF NOT EXISTS idx_backlinks_target ON backlinks(targetBlockId);

  -- FTS5 全文索引
  CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING FTS5(
    content,
    content='blocks',
    content_rowid='id'
  );
`
