# API 接口文档

**版本**: 1.0  
**日期**: 2026-03-21  
**说明**: 虽然采用前后端融合架构，但 Service 层接口仍需规范定义

---

## 1. 概述

本文档定义应用层 Service 接口规范。虽然本项目采用前后端融合架构（前端直接访问 SQLite），但 Service 层作为业务逻辑的核心，其接口设计遵循以下原则：

1. **接口隔离**: 每个 Service 有清晰的职责边界
2. **类型安全**: 完整的 TypeScript 类型定义
3. **可测试性**: 便于单元测试和 Mock
4. **可扩展性**: 预留未来拆分为独立 API 的能力

---

## 2. Service 接口规范

### 2.1 BlockService - 块服务

负责块的 CRUD 操作和大纲层级管理。

```typescript
// types/block.ts
export interface Block {
  id: string;           // UUID
  docId: string;        // 文档ID
  content: string;      // 内容
  parentId?: string;    // 父块ID
  order: number;        // 排序
  collapsed: boolean;   // 是否折叠
  createdAt: number;    // 创建时间
  updatedAt: number;    // 更新时间
}

export interface CreateBlockInput {
  docId: string;
  content: string;
  parentId?: string;
  order?: number;
}

export interface UpdateBlockInput {
  content?: string;
  order?: number;
  collapsed?: boolean;
}

// services/BlockService.ts
export interface IBlockService {
  // 查询
  getBlock(id: string): Promise<Block | null>;
  getBlocksByDoc(docId: string): Promise<Block[]>;
  getChildren(parentId: string): Promise<Block[]>;
  getDocTree(docId: string): Promise<Block[]>;  // 获取完整文档树
  
  // 创建
  createBlock(input: CreateBlockInput): Promise<Block>;
  createBlocks(inputs: CreateBlockInput[]): Promise<Block[]>;  // 批量创建
  
  // 更新
  updateBlock(id: string, input: UpdateBlockInput): Promise<Block>;
  moveBlock(id: string, newParentId: string | null, newOrder: number): Promise<Block>;
  
  // 删除
  deleteBlock(id: string): Promise<void>;
  deleteBlocksByDoc(docId: string): Promise<void>;  // 删除整个文档
  
  // 工具
  duplicateBlock(id: string): Promise<Block>;
  exportToMarkdown(docId: string): Promise<string>;
}
```

**使用示例**:

```typescript
const blockService = new BlockService(blockRepository);

// 创建大纲节点
const block = await blockService.createBlock({
  docId: '2026-03-21',
  content: '- 今日任务',
  parentId: null,
  order: 0,
});

// 创建子节点
const childBlock = await blockService.createBlock({
  docId: '2026-03-21',
  content: '  - 完成登录功能',
  parentId: block.id,
  order: 0,
});

// 移动节点
await blockService.moveBlock(childBlock.id, newParentId, 1);

// 获取文档树
const tree = await blockService.getDocTree('2026-03-21');
```

---

### 2.2 LinkService - 链接服务

负责双向链接的创建、删除和查询。

```typescript
// types/link.ts
export interface Backlink {
  blockId: string;      // 源块ID
  targetId: string;     // 目标块ID
  createdAt: number;    // 创建时间
}

export interface BacklinkWithContext extends Backlink {
  sourceContent: string;  // 源块内容
  context: string;        // 引用上下文
  sourceDocId: string;    // 源块所在文档
}

export interface LinkGraph {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ source: string; target: string }>;
}

// services/LinkService.ts
export interface ILinkService {
  // 创建/删除
  createLink(sourceId: string, targetId: string): Promise<void>;
  removeLink(sourceId: string, targetId: string): Promise<void>;
  
  // 查询
  getBacklinks(targetId: string, limit?: number): Promise<BacklinkWithContext[]>;
  getOutgoingLinks(sourceId: string): Promise<string[]>;  // 获取块引用的所有块
  getLinkedBlocks(blockId: string): Promise<Block[]>;     // 获取关联的所有块
  
  // 同步
  syncBacklinks(blockId: string, content: string): Promise<void>;  // 解析内容中的 [[links]]
  
  // 预留：链接图
  // getLinkGraph(): Promise<LinkGraph>;
  // getShortestPath(fromId: string, toId: string): Promise<string[]>;
}
```

**使用示例**:

```typescript
const linkService = new LinkService(linkRepository, blockRepository);

// 创建链接
await linkService.createLink('source-block-id', 'target-block-id');

// 获取反链
const backlinks = await linkService.getBacklinks('target-block-id', 20);
// 返回: [{ blockId, targetId, sourceContent, context, sourceDocId }]

// 同步反链（解析内容中的 [[wikilinks]]）
await linkService.syncBacklinks('block-id', '内容包含 [[目标块ID]] 的文本');
```

---

### 2.3 DailyNoteService - 每日笔记服务

负责 Daily Notes 的自动创建和模板管理。

```typescript
// types/daily-note.ts
export interface DailyNoteTemplate {
  name: string;
  content: string;  // 支持 {{date}} 占位符
}

export interface DailyNote {
  date: string;      // yyyy-MM-dd
  block: Block;
  isNew: boolean;    // 是否新创建
}

// services/DailyNoteService.ts
export interface IDailyNoteService {
  // 获取/创建
  getOrCreateTodayNote(): Promise<DailyNote>;
  getOrCreateNoteByDate(date: string): Promise<DailyNote>;
  
  // 查询
  getNoteByDate(date: string): Promise<Block | null>;
  getPreviousNote(date: string): Promise<Block | null>;
  getNextNote(date: string): Promise<Block | null>;
  getRecentNotes(limit?: number): Promise<Block[]>;
  
  // 检查
  hasNote(date: string): Promise<boolean>;
  
  // 模板
  getTemplate(name: string): Promise<DailyNoteTemplate>;
  setTemplate(name: string, template: DailyNoteTemplate): Promise<void>;
  listTemplates(): Promise<DailyNoteTemplate[]>;
}
```

**使用示例**:

```typescript
const dailyNoteService = new DailyNoteService(blockService, templateRepository);

// 获取或创建今日笔记
const { date, block, isNew } = await dailyNoteService.getOrCreateTodayNote();

// 日期导航
const yesterday = await dailyNoteService.getPreviousNote('2026-03-21');
const tomorrow = await dailyNoteService.getNextNote('2026-03-21');

// 获取最近笔记
const recent = await dailyNoteService.getRecentNotes(7);
```

---

### 2.4 SearchService - 搜索服务

负责全文搜索和快速导航。

```typescript
// types/search.ts
export interface SearchResult {
  block: Block;
  highlights: string[];  // 高亮片段
  rank: number;          // 相关性分数
}

export interface SearchFilters {
  docId?: string;        // 限定文档
  dateFrom?: string;     // 日期范围
  dateTo?: string;
  hasLinks?: boolean;    // 是否包含链接
}

// services/SearchService.ts
export interface ISearchService {
  // 全文搜索
  search(keyword: string, filters?: SearchFilters, limit?: number): Promise<SearchResult[]>;
  
  // 快速搜索（用于自动补全）
  quickSearch(keyword: string, limit?: number): Promise<Array<{ id: string; title: string }>>;
  
  // 最近访问
  getRecentDocs(limit?: number): Promise<string[]>;
  addToRecent(docId: string): Promise<void>;
  
  // 搜索建议
  getSuggestions(partial: string): Promise<string[]>;
}
```

**使用示例**:

```typescript
const searchService = new SearchService(blockRepository);

// 全文搜索
const results = await searchService.search('项目进展', { limit: 20 });
// 返回: [{ block, highlights: ['...项目进展...'], rank: 1.5 }]

// 快速搜索（自动补全）
const suggestions = await searchService.quickSearch('项', 10);
// 返回: [{ id: 'block-1', title: '项目A进展' }]

// 带过滤的搜索
const filtered = await searchService.search('任务', {
  docId: '2026-03-21',
  dateFrom: '2026-03-01',
});
```

---

### 2.5 AttachmentService - 附件服务

负责附件上传、下载和管理。

```typescript
// types/attachment.ts
export interface Attachment {
  id: string;
  blockId?: string;
  filename: string;
  storageName: string;
  mimeType: string;
  size: number;
  createdAt: number;
  url: string;  // 访问 URL
}

export interface UploadResult {
  success: Attachment[];
  failed: Array<{ filename: string; error: string }>;
}

// services/AttachmentService.ts
export interface IAttachmentService {
  // 上传
  upload(files: File[], blockId?: string): Promise<UploadResult>;
  
  // 下载
  download(id: string): Promise<Buffer>;
  getUrl(id: string): string;
  
  // 查询
  getAttachments(blockId?: string): Promise<Attachment[]>;
  getAttachment(id: string): Promise<Attachment | null>;
  
  // 删除
  deleteAttachment(id: string): Promise<void>;
  deleteAttachmentsByBlock(blockId: string): Promise<void>;
  
  // 工具
  getStorageStats(): Promise<{ count: number; totalSize: number }>;
}
```

---

### 2.6 SettingsService - 设置服务

负责用户配置和系统设置。

```typescript
// types/settings.ts
export interface Settings {
  theme: 'light' | 'dark' | 'auto';
  editorFontSize: number;
  dailyNoteTemplate: string;
  lastOpenedDoc?: string;
  shortcuts: Record<string, string>;
}

// services/SettingsService.ts
export interface ISettingsService {
  // 获取
  get<T>(key: keyof Settings): Promise<T | undefined>;
  getAll(): Promise<Partial<Settings>>;
  
  // 设置
  set<T>(key: keyof Settings, value: T): Promise<void>;
  setMultiple(settings: Partial<Settings>): Promise<void>;
  
  // 重置
  reset(key: keyof Settings): Promise<void>;
  resetAll(): Promise<void>;
  
  // 导出/导入
  exportSettings(): Promise<string>;  // JSON
  importSettings(json: string): Promise<void>;
}
```

---

## 3. 错误处理规范

### 3.1 错误类型

```typescript
// errors/AppError.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}
```

### 3.2 使用示例

```typescript
async getBlock(id: string): Promise<Block> {
  const block = await this.repository.findById(id);
  if (!block) {
    throw new NotFoundError('Block', id);
  }
  return block;
}

async createBlock(input: CreateBlockInput): Promise<Block> {
  if (!input.docId) {
    throw new ValidationError('docId is required');
  }
  // ...
}
```

---

## 4. 事件系统（预留）

虽然当前采用同步调用，但预留事件系统接口便于后续扩展：

```typescript
// events/EventBus.ts
export interface IEventBus {
  emit(event: string, data: unknown): void;
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
}

// 事件类型
export type BlockEvent = 
  | { type: 'block:created'; block: Block }
  | { type: 'block:updated'; block: Block; changes: Partial<Block> }
  | { type: 'block:deleted'; id: string }
  | { type: 'block:moved'; id: string; from: string | null; to: string | null };

export type LinkEvent =
  | { type: 'link:created'; sourceId: string; targetId: string }
  | { type: 'link:removed'; sourceId: string; targetId: string };
```

---

## 5. 接口版本控制

### 5.1 版本策略

```typescript
// 在 Service 构造函数中传入版本
interface ServiceContext {
  version: string;
  db: Database;
}

class BlockService implements IBlockService {
  constructor(private context: ServiceContext) {}
  
  async getBlock(id: string): Promise<Block> {
    if (this.context.version >= '2.0.0') {
      // 新版本逻辑
    } else {
      // 旧版本逻辑
    }
  }
}
```

---

## 6. 测试接口

### 6.1 Mock 示例

```typescript
// __mocks__/BlockService.ts
export class MockBlockService implements IBlockService {
  private blocks: Block[] = [];
  
  async getBlock(id: string): Promise<Block | null> {
    return this.blocks.find(b => b.id === id) || null;
  }
  
  async createBlock(input: CreateBlockInput): Promise<Block> {
    const block: Block = {
      id: `mock-${Date.now()}`,
      ...input,
      order: input.order || 0,
      collapsed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.blocks.push(block);
    return block;
  }
  
  // ... 其他方法
}
```

---

## 附录 A: 接口变更日志

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-03-21 | 初始版本 |

## 附录 B: 相关文档

- [架构设计](./架构设计.md)
- [数据库设计](./数据库设计.md)
- [开发规范](./开发规范.md)
