---
name: docs
description: 编写 API 文档、数据库文档、扩展文档时触发。包含 TypeDoc 注释规范和 Markdown 表格格式。
---

# docs

## 命令

```bash
npm run docs          # 生成 API 文档
npx typedoc src       # 使用 TypeDoc 生成文档
```

## 使用场景

- 编写服务类 API 文档
- 记录数据库表结构
- 编写 Tiptap 扩展使用说明
- 创建配置选项文档

## 输出解释

### API 文档

服务类使用 **TypeDoc** 生成 API 文档：

```typescript
/**
 * 获取指定文档的所有块。
 * @param docId 文档ID
 * @returns 块列表
 */
async function getBlocks(docId: string): Promise<Block[]> { ... }
```

### 数据库文档

表结构使用 **Markdown 表格** 记录：

```markdown
| 字段       | 类型     | 描述           |
|------------|----------|--------------------------|
| id         | TEXT     | 块ID（UUID）             |
| doc_id     | TEXT     | 文档ID（如 "2026-03-21"） |
| content    | TEXT     | Markdown 内容            |
```

### 扩展文档

Tiptap 扩展包含**用法示例**和**配置选项**：

```markdown
## WikilinkExtension

### 用法
\`\`\`typescript
import { WikilinkExtension } from './extensions/WikilinkExtension';

const editor = new Editor({
  extensions: [WikilinkExtension],
});
\`\`\`

### 配置
| 选项          | 类型      | 默认值 | 描述               |
|---------------|-----------|--------|--------------------|
| linkClass      | string    | 'link' | 链接的 CSS 类名    |
| suggestionChar | string    | '['    | 触发补全的字符      |
```

## 示例

### 完整的服务类文档示例

```typescript
/**
 * 块管理服务，提供块的 CRUD 操作。
 * 
 * @example
 * ```typescript
 * const service = new BlockService(repository);
 * const blocks = await service.getBlocks('2026-03-21');
 * ```
 */
export class BlockService {
  /**
   * 创建 BlockService 实例。
   * @param repository 块数据仓库
   */
  constructor(private readonly repository: BlockRepository) {}

  /**
   * 获取指定文档的所有块。
   * @param docId 文档ID，格式为日期字符串（如 "2026-03-21"）
   * @returns 块列表，按创建时间排序
   * @throws {NotFoundError} 文档不存在时抛出
   */
  async getBlocks(docId: string): Promise<Block[]> {
    return this.repository.findByDoc(docId);
  }

  /**
   * 创建新块。
   * @param docId 文档ID
   * @param content 块内容（Markdown 格式）
   * @returns 创建的块对象
   */
  async createBlock(docId: string, content: string): Promise<Block> {
    const block: Block = {
      id: generateUUID(),
      docId,
      content,
      createdAt: new Date(),
    };
    await this.repository.insert(block);
    return block;
  }
}
```

### 数据库表结构文档示例

```markdown
# 数据库表结构

## blocks 表

存储文档块内容。

| 字段        | 类型      | 约束           | 描述                    |
|-------------|-----------|----------------|-------------------------|
| id          | TEXT      | PRIMARY KEY    | 块ID（UUID）            |
| doc_id      | TEXT      | NOT NULL       | 文档ID                  |
| content     | TEXT      | NOT NULL       | Markdown 内容           |
| parent_id   | TEXT      | FOREIGN KEY    | 父块ID（嵌套块）        |
| created_at  | DATETIME  | DEFAULT NOW    | 创建时间                |
| updated_at  | DATETIME  |                | 更新时间                |

### 索引

| 索引名              | 字段      | 类型   |
|---------------------|-----------|--------|
| idx_blocks_doc_id   | doc_id    | B-tree |
| idx_blocks_parent_id| parent_id | B-tree |

## backlinks 表

存储双向链接关系。

| 字段        | 类型      | 约束           | 描述                    |
|-------------|-----------|----------------|-------------------------|
| source_id   | TEXT      | NOT NULL       | 源块ID                  |
| target_id   | TEXT      | NOT NULL       | 目标块ID                |
| created_at  | DATETIME  | DEFAULT NOW    | 创建时间                |
```
