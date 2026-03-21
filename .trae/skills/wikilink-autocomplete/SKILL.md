---
name: wikilink-autocomplete
description: 双向链接自动补全功能。包含输入监听、建议列表、块搜索和链接插入。
---

# wikilink-autocomplete

## 命令

```typescript
// 触发建议
editor.commands.insertContent('[[');

// 选择建议项
editor.commands.setWikilink({ id: 'block-id', title: 'Block Title' });

// 关闭建议
editor.commands.closeSuggestion();
```

## 使用场景

- 输入 `[[` 时触发自动补全
- 搜索并选择已有块
- 创建新块链接
- 实现模糊搜索匹配

## 输出解释

### 触发机制

当用户输入 `[[` 时触发建议列表：

```typescript
// ✅ 正确：使用 Tiptap 插件监听输入
new Plugin({
  key: new PluginKey('wikilinkSuggestion'),
  props: {
    handleTextInput(view, from, to, text) {
      if (text === '[') {
        const before = view.state.doc.textBetween(from - 1, from);
        if (before === '[') {
          // 触发建议
          showSuggestion(view, from + 1);
          return true;
        }
      }
      return false;
    },
  },
});
```

### 搜索策略

支持多种搜索方式：

| 搜索类型 | 示例 | 说明 |
|---------|------|------|
| 前缀匹配 | `[[项目` | 匹配标题以"项目"开头的块 |
| 模糊匹配 | `[[xm` | 匹配包含"项目"拼音首字母的块 |
| 全文搜索 | `[[内容关键词` | 使用 FTS5 全文索引搜索 |

### 建议列表数据结构

```typescript
interface SuggestionItem {
  id: string;           // 块 ID
  title: string;        // 显示标题（块内容前 50 字符）
  content: string;      // 完整内容预览
  type: 'existing' | 'new'; // 已有块 / 新建块
}
```

### 链接格式

插入的链接格式：

```typescript
// ✅ 正确：使用 data-target 存储目标 ID
<a href="block:block-id" data-target="block-id" class="wikilink">显示文本</a>

// 或简写形式
[[block-id|显示文本]]
```

## 示例

### WikilinkSuggestionPlugin 完整实现

```typescript
// extensions/WikilinkSuggestionPlugin.ts
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { BlockService } from '../services/BlockService';

export interface SuggestionState {
  active: boolean;
  query: string;
  items: SuggestionItem[];
  selectedIndex: number;
  from: number;
  to: number;
}

export const WikilinkSuggestionPlugin = (blockService: BlockService) => {
  return new Plugin<SuggestionState>({
    key: new PluginKey('wikilinkSuggestion'),
    
    state: {
      init(): SuggestionState {
        return {
          active: false,
          query: '',
          items: [],
          selectedIndex: 0,
          from: 0,
          to: 0,
        };
      },
      
      apply(tr, value): SuggestionState {
        const meta = tr.getMeta('wikilinkSuggestion');
        if (meta) {
          return { ...value, ...meta };
        }
        return value;
      },
    },

    props: {
      handleTextInput(view, from, to, text) {
        const { state } = view;
        
        // 检测输入 `[`
        if (text === '[') {
          const before = state.doc.textBetween(Math.max(0, from - 1), from);
          if (before === '[') {
            // 触发建议
            const tr = state.tr;
            tr.setMeta('wikilinkSuggestion', {
              active: true,
              query: '',
              from: from + 1,
              to: from + 1,
            });
            view.dispatch(tr);
            return true;
          }
        }
        
        // 更新查询
        const pluginState = this.getState(state);
        if (pluginState?.active) {
          const query = state.doc.textBetween(pluginState.from, from + 1);
          // 异步搜索
          blockService.searchBlocks(query).then(items => {
            view.dispatch(state.tr.setMeta('wikilinkSuggestion', {
              query,
              items: items.slice(0, 10),
            }));
          });
        }
        
        return false;
      },

      handleKeyDown(view, event) {
        const state = this.getState(view.state);
        if (!state?.active) return false;

        switch (event.key) {
          case 'ArrowDown':
            view.dispatch(view.state.tr.setMeta('wikilinkSuggestion', {
              selectedIndex: (state.selectedIndex + 1) % state.items.length,
            }));
            return true;
            
          case 'ArrowUp':
            view.dispatch(view.state.tr.setMeta('wikilinkSuggestion', {
              selectedIndex: (state.selectedIndex - 1 + state.items.length) % state.items.length,
            }));
            return true;
            
          case 'Enter':
            const selected = state.items[state.selectedIndex];
            if (selected) {
              insertWikilink(view, state.from, state.to, selected);
            }
            return true;
            
          case 'Escape':
            view.dispatch(view.state.tr.setMeta('wikilinkSuggestion', {
              active: false,
            }));
            return true;
        }
        
        return false;
      },

      decorations(state) {
        const pluginState = this.getState(state);
        if (!pluginState?.active) return DecorationSet.empty;
        
        // 高亮触发位置
        const decoration = Decoration.inline(pluginState.from, pluginState.to, {
          class: 'wikilink-suggestion-trigger',
        });
        return DecorationSet.create(state.doc, [decoration]);
      },
    },
  });
};

// 插入双向链接
function insertWikilink(view, from: number, to: number, item: SuggestionItem) {
  const { state } = view;
  const tr = state.tr;
  
  // 删除触发字符 `[`
  tr.delete(from - 2, to);
  
  // 插入链接
  const linkNode = state.schema.nodes.wikilink.create({
    target: item.id,
    title: item.title,
  });
  tr.insert(from - 2, linkNode);
  
  // 关闭建议
  tr.setMeta('wikilinkSuggestion', { active: false });
  
  view.dispatch(tr);
}
```

### 建议列表 UI 组件

```typescript
// components/WikilinkSuggestion.tsx
import React, { useEffect, useRef } from 'react';
import type { SuggestionItem } from '../extensions/WikilinkSuggestionPlugin';

interface Props {
  items: SuggestionItem[];
  selectedIndex: number;
  query: string;
  onSelect: (item: SuggestionItem) => void;
  onClose: () => void;
}

export const WikilinkSuggestion: React.FC<Props> = ({
  items,
  selectedIndex,
  query,
  onSelect,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 滚动选中项到视图
    const selected = containerRef.current?.children[selectedIndex];
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (items.length === 0) {
    return (
      <div className="suggestion-empty">
        未找到匹配项，按 Enter 创建新块
      </div>
    );
  }

  return (
    <div className="suggestion-list" ref={containerRef}>
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(item)}
        >
          <div className="suggestion-title">
            {highlightMatch(item.title, query)}
          </div>
          <div className="suggestion-preview">
            {item.content.slice(0, 100)}...
          </div>
          {item.type === 'new' && (
            <span className="suggestion-badge">新建</span>
          )}
        </div>
      ))}
    </div>
  );
};

// 高亮匹配文本
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i}>{part}</mark>
    ) : part
  );
}
```

### BlockService 搜索方法

```typescript
// services/BlockService.ts
export class BlockService {
  // ... 其他方法

  /**
   * 搜索块（用于自动补全）
   */
  async searchBlocks(query: string, limit: number = 10): Promise<SuggestionItem[]> {
    if (!query.trim()) {
      // 返回最近更新的块
      return this.db.prepare(
        'SELECT id, content FROM blocks ORDER BY updated_at DESC LIMIT ?'
      ).all(limit).map(row => ({
        id: row.id,
        title: this.extractTitle(row.content),
        content: row.content,
        type: 'existing',
      }));
    }

    // 使用 FTS5 全文搜索
    const results = this.db.prepare(
      'SELECT b.id, b.content FROM blocks b ' +
      'JOIN blocks_fts fts ON b.id = fts.rowid ' +
      'WHERE fts.content MATCH ? ' +
      'LIMIT ?'
    ).all(`${query}*`, limit);

    return results.map(row => ({
      id: row.id,
      title: this.extractTitle(row.content),
      content: row.content,
      type: 'existing',
    }));
  }

  /**
   * 从内容提取标题
   */
  private extractTitle(content: string): string {
    // 移除 Markdown 标记，取前 50 字符
    return content
      .replace(/[#*`\[\]]/g, '')
      .slice(0, 50)
      .trim() || '无标题';
  }
}
```

### 快捷键绑定

```typescript
// hooks/useWikilinkShortcut.ts
import { useEffect } from 'react';
import { useEditor } from '@tiptap/react';

export function useWikilinkShortcut() {
  const editor = useEditor();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 插入 [[
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        editor?.commands.insertContent('[[');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor]);
}
```
