---
name: daily-notes
description: 每日笔记自动创建和管理。包含日期生成、模板加载、自动创建逻辑和快捷操作。
---

# daily-notes

## 命令

```typescript
// 获取或创建今日笔记
const todayNote = await dailyNoteService.getOrCreateTodayNote();

// 获取指定日期笔记
const note = await dailyNoteService.getNoteByDate('2026-03-21');

// 创建带模板的笔记
const note = await dailyNoteService.createWithTemplate('2026-03-21', 'default');
```

## 使用场景

- 每日自动创建笔记
- 加载自定义模板
- 快速跳转到今日笔记
- 实现日期导航（前一天/后一天）

## 输出解释

### 日期格式

使用 **ISO 8601** 日期格式（`yyyy-MM-dd`）作为文档 ID：

```typescript
// ✅ 正确
const today = format(new Date(), 'yyyy-MM-dd'); // "2026-03-21"

// ❌ 错误
const today = new Date().toString(); // 格式不统一
```

### 自动创建逻辑

启动应用时检查当日笔记是否存在，不存在则自动创建：

```typescript
// ✅ 正确
const today = format(new Date(), 'yyyy-MM-dd');
const exists = db.prepare('SELECT 1 FROM blocks WHERE doc_id = ?').get(today);
if (!exists) {
  const template = await templateService.getTemplate('default');
  db.prepare('INSERT INTO blocks (id, doc_id, content) VALUES (?, ?, ?)')
    .run(uuidv4(), today, template.content);
}
```

### 模板系统

支持多种模板类型：

| 模板名称 | 用途 | 示例内容 |
|---------|------|---------|
| `default` | 默认模板 | `# 今日笔记\n- ` |
| `task` | 任务导向 | `# 今日任务\n- [ ] ` |
| `journal` | 日记模式 | `# 日记\n## 今日心情\n` |

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+D` | 跳转到今日笔记 |
| `Ctrl+Alt+←` | 前一天笔记 |
| `Ctrl+Alt+→` | 后一天笔记 |

## 示例

### DailyNoteService 完整实现

```typescript
// services/DailyNoteService.ts
import { format, addDays, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from 'better-sqlite3';
import type { Block } from '../types/block';

export interface DailyNoteTemplate {
  name: string;
  content: string;
}

export class DailyNoteService {
  constructor(
    private db: Database,
    private templates: Map<string, DailyNoteTemplate>
  ) {}

  /**
   * 获取或创建今日笔记
   */
  async getOrCreateTodayNote(): Promise<Block> {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.getOrCreateNoteByDate(today);
  }

  /**
   * 获取或创建指定日期笔记
   */
  async getOrCreateNoteByDate(dateStr: string): Promise<Block> {
    // 检查是否已存在
    const existing = this.db.prepare(
      'SELECT * FROM blocks WHERE doc_id = ? LIMIT 1'
    ).get(dateStr) as Block | undefined;

    if (existing) {
      return existing;
    }

    // 创建新笔记
    return this.createNote(dateStr, 'default');
  }

  /**
   * 创建带模板的笔记
   */
  async createNote(dateStr: string, templateName: string): Promise<Block> {
    const template = this.templates.get(templateName);
    const content = template?.content || '# 今日笔记\n- ';
    
    const block: Block = {
      id: uuidv4(),
      docId: dateStr,
      content: content.replace('{{date}}', dateStr),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.db.prepare(
      'INSERT INTO blocks (id, doc_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(block.id, block.docId, block.content, block.createdAt, block.updatedAt);

    return block;
  }

  /**
   * 获取前一天笔记
   */
  async getPreviousNote(dateStr: string): Promise<Block | null> {
    const currentDate = new Date(dateStr);
    const previousDate = subDays(currentDate, 1);
    const previousStr = format(previousDate, 'yyyy-MM-dd');
    
    const note = this.db.prepare(
      'SELECT * FROM blocks WHERE doc_id = ? LIMIT 1'
    ).get(previousStr) as Block | undefined;
    
    return note || null;
  }

  /**
   * 获取后一天笔记
   */
  async getNextNote(dateStr: string): Promise<Block | null> {
    const currentDate = new Date(dateStr);
    const nextDate = addDays(currentDate, 1);
    const nextStr = format(nextDate, 'yyyy-MM-dd');
    
    const note = this.db.prepare(
      'SELECT * FROM blocks WHERE doc_id = ? LIMIT 1'
    ).get(nextStr) as Block | undefined;
    
    return note || null;
  }

  /**
   * 检查指定日期是否有笔记
   */
  async hasNote(dateStr: string): Promise<boolean> {
    const result = this.db.prepare(
      'SELECT 1 FROM blocks WHERE doc_id = ? LIMIT 1'
    ).get(dateStr);
    return !!result;
  }

  /**
   * 获取最近的笔记列表
   */
  async getRecentNotes(limit: number = 7): Promise<Block[]> {
    return this.db.prepare(
      'SELECT * FROM blocks WHERE doc_id LIKE "____-__-__" ORDER BY doc_id DESC LIMIT ?'
    ).all(limit) as Block[];
  }
}
```

### React Hook 示例

```typescript
// hooks/useDailyNote.ts
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DailyNoteService } from '../services/DailyNoteService';

export function useDailyNote(service: DailyNoteService) {
  const navigate = useNavigate();

  const goToToday = useCallback(async () => {
    const note = await service.getOrCreateTodayNote();
    navigate(`/note/${note.docId}`);
  }, [navigate, service]);

  const goToPreviousDay = useCallback(async (currentDate: string) => {
    const note = await service.getPreviousNote(currentDate);
    if (note) {
      navigate(`/note/${note.docId}`);
    }
  }, [navigate, service]);

  const goToNextDay = useCallback(async (currentDate: string) => {
    const note = await service.getNextNote(currentDate);
    if (note) {
      navigate(`/note/${note.docId}`);
    }
  }, [navigate, service]);

  return {
    goToToday,
    goToPreviousDay,
    goToNextDay,
  };
}
```

### 模板配置示例

```typescript
// config/templates.ts
import { DailyNoteTemplate } from '../services/DailyNoteService';

export const defaultTemplates: Map<string, DailyNoteTemplate> = new Map([
  ['default', {
    name: 'default',
    content: `# {{date}} 今日笔记

## 今日任务
- [ ] 

## 灵感记录
- 

## 回顾总结
`,
  }],
  ['minimal', {
    name: 'minimal',
    content: `# {{date}}

- `,
  }],
  ['journal', {
    name: 'journal',
    content: `# {{date}} 日记

## 今日心情

## 重要事件

## 反思总结
`,
  }],
]);
```
