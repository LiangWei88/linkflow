---
name: backlink-panel
description: 反链面板实现。包含反链查询、面板展示、拖拽集成和上下文预览。
---

# backlink-panel

## 命令

```typescript
// 获取块的反链
const backlinks = await backlinkService.getBacklinks('block-id');

// 创建反链
await backlinkService.createBacklink('source-id', 'target-id');

// 删除反链
await backlinkService.removeBacklink('source-id', 'target-id');
```

## 使用场景

- 展示当前块的所有反向链接
- 点击反链跳转到源块
- 拖拽反链到正文引用
- 显示反链上下文预览

## 输出解释

### 反链数据结构

```typescript
interface Backlink {
  sourceId: string;      // 源块 ID（引用当前块的块）
  targetId: string;      // 目标块 ID（当前块）
  createdAt: number;     // 创建时间
}

interface BacklinkWithContext extends Backlink {
  sourceContent: string; // 源块内容
  context: string;       // 引用上下文（前后文本）
  sourceDocId: string;   // 源块所在文档
}
```

### 数据库表结构

```sql
-- 反链表
CREATE TABLE backlinks (
  block_id TEXT NOT NULL,  -- 源块 ID（引用者）
  target_id TEXT NOT NULL, -- 目标块 ID（被引用者）
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY(block_id, target_id),
  FOREIGN KEY(block_id) REFERENCES blocks(id) ON DELETE CASCADE,
  FOREIGN KEY(target_id) REFERENCES blocks(id) ON DELETE CASCADE
);

-- 索引优化
CREATE INDEX idx_backlinks_target ON backlinks(target_id);
CREATE INDEX idx_backlinks_block ON backlinks(block_id);
```

### 上下文提取

显示反链时，提取引用位置的前后文本作为上下文：

```typescript
// ✅ 正确：提取引用上下文
function extractContext(content: string, targetId: string, contextLength: number = 50): string {
  const linkPattern = new RegExp(`\\[\\[${targetId}[^\\]]*\\]\\]`);
  const match = content.match(linkPattern);
  
  if (!match) return content.slice(0, 100);
  
  const linkIndex = match.index!;
  const start = Math.max(0, linkIndex - contextLength);
  const end = Math.min(content.length, linkIndex + match[0].length + contextLength);
  
  return content.slice(start, end);
}
```

### 面板布局

| 区域 | 内容 | 交互 |
|------|------|------|
| 头部 | "N 个反链" + 刷新按钮 | 点击刷新 |
| 列表 | 反链项（标题+上下文） | 点击跳转、拖拽引用 |
| 空状态 | "暂无反链" 提示 | - |

## 示例

### BacklinkService 完整实现

```typescript
// services/BacklinkService.ts
import type { Database } from 'better-sqlite3';

export interface Backlink {
  blockId: string;
  targetId: string;
  createdAt: number;
}

export interface BacklinkWithContext {
  blockId: string;
  targetId: string;
  createdAt: number;
  sourceContent: string;
  context: string;
  sourceDocId: string;
}

export class BacklinkService {
  constructor(private db: Database) {}

  /**
   * 创建反链
   */
  async createBacklink(blockId: string, targetId: string): Promise<void> {
    this.db.prepare(
      'INSERT OR IGNORE INTO backlinks (block_id, target_id) VALUES (?, ?)'
    ).run(blockId, targetId);
  }

  /**
   * 删除反链
   */
  async removeBacklink(blockId: string, targetId: string): Promise<void> {
    this.db.prepare(
      'DELETE FROM backlinks WHERE block_id = ? AND target_id = ?'
    ).run(blockId, targetId);
  }

  /**
   * 获取块的反链（带上下文）
   */
  async getBacklinks(targetId: string, limit: number = 20): Promise<BacklinkWithContext[]> {
    const backlinks = this.db.prepare(
      'SELECT b.*, blk.content as source_content, blk.doc_id as source_doc_id ' +
      'FROM backlinks b ' +
      'JOIN blocks blk ON b.block_id = blk.id ' +
      'WHERE b.target_id = ? ' +
      'ORDER BY b.created_at DESC ' +
      'LIMIT ?'
    ).all(targetId, limit) as Array<{
      block_id: string;
      target_id: string;
      created_at: number;
      source_content: string;
      source_doc_id: string;
    }>;

    return backlinks.map(row => ({
      blockId: row.block_id,
      targetId: row.target_id,
      createdAt: row.created_at,
      sourceContent: row.source_content,
      context: this.extractContext(row.source_content, targetId),
      sourceDocId: row.source_doc_id,
    }));
  }

  /**
   * 获取块的 outgoing links（该块引用了哪些块）
   */
  async getOutgoingLinks(blockId: string): Promise<string[]> {
    const results = this.db.prepare(
      'SELECT target_id FROM backlinks WHERE block_id = ?'
    ).all(blockId) as Array<{ target_id: string }>;
    
    return results.map(r => r.target_id);
  }

  /**
   * 批量创建反链（解析内容中的 [[wikilinks]]）
   */
  async syncBacklinks(blockId: string, content: string): Promise<void> {
    // 提取所有 wikilink
    const wikilinkPattern = /\[\[([^\]]+)\]\]/g;
    const targetIds: string[] = [];
    let match;
    
    while ((match = wikilinkPattern.exec(content)) !== null) {
      const targetId = match[1].split('|')[0]; // 处理 [[id|title]] 格式
      targetIds.push(targetId);
    }

    // 事务：先删除旧反链，再创建新反链
    this.db.exec('BEGIN TRANSACTION');
    try {
      // 删除该块的所有反链
      this.db.prepare('DELETE FROM backlinks WHERE block_id = ?').run(blockId);
      
      // 创建新反链
      const insert = this.db.prepare(
        'INSERT OR IGNORE INTO backlinks (block_id, target_id) VALUES (?, ?)'
      );
      
      for (const targetId of targetIds) {
        insert.run(blockId, targetId);
      }
      
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * 提取上下文
   */
  private extractContext(content: string, targetId: string, contextLength: number = 50): string {
    // 支持 [[id]] 和 [[id|title]] 两种格式
    const patterns = [
      new RegExp(`\\[\\[${targetId}\\]\\]`),
      new RegExp(`\\[\\[${targetId}\\|[^\\]]+\\]\\]`),
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match.index !== undefined) {
        const start = Math.max(0, match.index - contextLength);
        const end = Math.min(content.length, match.index + match[0].length + contextLength);
        return content.slice(start, end);
      }
    }
    
    return content.slice(0, contextLength * 2);
  }
}
```

### BacklinkPanel 组件

```typescript
// components/BacklinkPanel.tsx
import React, { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { BacklinkService, BacklinkWithContext } from '../services/BacklinkService';

interface Props {
  blockId: string;
  backlinkService: BacklinkService;
  onNavigate: (blockId: string) => void;
}

export const BacklinkPanel: React.FC<Props> = ({
  blockId,
  backlinkService,
  onNavigate,
}) => {
  const [backlinks, setBacklinks] = useState<BacklinkWithContext[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBacklinks = async () => {
    setLoading(true);
    try {
      const data = await backlinkService.getBacklinks(blockId);
      setBacklinks(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBacklinks();
  }, [blockId]);

  if (loading) {
    return <div className="backlink-panel loading">加载中...</div>;
  }

  if (backlinks.length === 0) {
    return (
      <div className="backlink-panel empty">
        <p>暂无反链</p>
        <p className="hint">当其他笔记引用此块时，将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="backlink-panel">
      <div className="backlink-header">
        <h3>{backlinks.length} 个反链</h3>
        <button onClick={loadBacklinks} className="refresh-btn">
          刷新
        </button>
      </div>
      
      <div className="backlink-list">
        {backlinks.map(backlink => (
          <BacklinkItem
            key={backlink.blockId}
            backlink={backlink}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
};

// 单个反链项（支持拖拽）
const BacklinkItem: React.FC<{
  backlink: BacklinkWithContext;
  onNavigate: (blockId: string) => void;
}> = ({ backlink, onNavigate }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'backlink',
    item: { blockId: backlink.blockId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`backlink-item ${isDragging ? 'dragging' : ''}`}
      onClick={() => onNavigate(backlink.blockId)}
    >
      <div className="backlink-source">
        <span className="doc-badge">{backlink.sourceDocId}</span>
        <span className="time">{formatTime(backlink.createdAt)}</span>
      </div>
      <div className="backlink-context">
        {backlink.context}
      </div>
      <div className="backlink-hint">拖拽到正文引用</div>
    </div>
  );
};

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}
```

### 与编辑器集成

```typescript
// components/EditorWithBacklinks.tsx
import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BacklinkPanel } from './BacklinkPanel';
import { BacklinkService } from '../services/BacklinkService';
import { useNavigate } from 'react-router-dom';

interface Props {
  blockId: string;
  backlinkService: BacklinkService;
}

export const EditorWithBacklinks: React.FC<Props> = ({
  blockId,
  backlinkService,
}) => {
  const navigate = useNavigate();
  
  const editor = useEditor({
    // ... 编辑器配置
    onUpdate: ({ editor }) => {
      // 内容更新时同步反链
      const content = editor.getHTML();
      backlinkService.syncBacklinks(blockId, content);
    },
  });

  const handleNavigate = useCallback((targetBlockId: string) => {
    navigate(`/block/${targetBlockId}`);
  }, [navigate]);

  return (
    <div className="editor-with-backlinks">
      <div className="editor-main">
        <EditorContent editor={editor} />
      </div>
      <aside className="backlink-sidebar">
        <BacklinkPanel
          blockId={blockId}
          backlinkService={backlinkService}
          onNavigate={handleNavigate}
        />
      </aside>
    </div>
  );
};
```

### 拖拽接收（在编辑器中引用反链）

```typescript
// hooks/useBacklinkDrop.ts
import { useDrop } from 'react-dnd';
import { useEditor } from '@tiptap/react';

export function useBacklinkDrop() {
  const editor = useEditor();

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'backlink',
    drop: (item: { blockId: string }) => {
      // 在光标位置插入引用
      editor?.commands.insertContent(`[[${item.blockId}]]`);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return { drop, isOver };
}
```

### 样式示例

```css
/* BacklinkPanel.css */
.backlink-panel {
  width: 300px;
  padding: 16px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
}

.backlink-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.backlink-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.backlink-item {
  padding: 12px;
  margin-bottom: 8px;
  background: var(--bg-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.backlink-item:hover {
  background: var(--bg-hover);
}

.backlink-item.dragging {
  opacity: 0.5;
}

.backlink-source {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.doc-badge {
  padding: 2px 8px;
  background: var(--accent-color);
  color: white;
  border-radius: 4px;
}

.backlink-context {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.backlink-hint {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
  text-align: center;
}
```
