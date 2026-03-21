---
name: testing
description: 编写单元测试、集成测试、E2E 测试时触发。包含 Jest 配置、Mock 使用和测试数据库规范。
---

# testing

## 命令

```bash
npm test                    # 运行所有测试
npm test -- --watch        # 监听模式
npm test -- --coverage     # 生成覆盖率报告
npx cypress run            # 运行 E2E 测试
```

## 使用场景

- 编写服务类单元测试
- 测试 Tiptap 与 SQLite 的集成
- 编写 E2E 用户交互测试
- 配置测试环境和 Mock

## 输出解释

### 单元测试

服务类必须编写单元测试，使用 **Jest + Mock** 模拟依赖：

```typescript
// ✅ 正确
test('BlockService.getBlocks', async () => {
  const mockRepo = { findByDoc: jest.fn().mockResolvedValue([{ id: '1' }]) };
  const service = new BlockService(mockRepo);
  const blocks = await service.getBlocks('2026-03-21');
  expect(blocks.length).toBe(1);
});
```

### 集成测试

测试 Tiptap 与 SQLite 的交互，使用**临时数据库**避免污染数据：

```typescript
// ✅ 正确
test('save load blocks', async () => {
  const testDb = new Database(':memory:')
  initSchema(testDb) // 初始化表结构
  await saveBlocks(testDb, [{ id: '1', content: 'Test' }])
  const blocks = await loadBlocks(testDb)
  expect(blocks[0].content).toBe('Test')
});
```

### E2E 测试

使用 **Cypress** 测试交互，模拟真实用户流程：

```typescript
// ✅ 正确
it('creates a wikilink', () => {
  cy.visit('/')
  cy.get('.editor').type('[[')
  cy.get('.suggestion-item').first().click()
  cy.get('.wikilink').should('exist')
});
```

## 示例

### 完整的服务类测试示例

```typescript
// services/__tests__/BlockService.test.ts
import { BlockService } from '../BlockService';
import { BlockRepository } from '../../repositories/BlockRepository';

jest.mock('../../repositories/BlockRepository');

describe('BlockService', () => {
  let service: BlockService;
  let mockRepo: jest.Mocked<BlockRepository>;

  beforeEach(() => {
    mockRepo = {
      findByDoc: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;
    service = new BlockService(mockRepo);
  });

  describe('getBlocks', () => {
    it('should return blocks for a document', async () => {
      const mockBlocks = [{ id: '1', docId: '2026-03-21', content: 'Test' }];
      mockRepo.findByDoc.mockResolvedValue(mockBlocks);

      const result = await service.getBlocks('2026-03-21');

      expect(mockRepo.findByDoc).toHaveBeenCalledWith('2026-03-21');
      expect(result).toEqual(mockBlocks);
    });

    it('should return empty array when no blocks found', async () => {
      mockRepo.findByDoc.mockResolvedValue([]);

      const result = await service.getBlocks('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('createBlock', () => {
    it('should create a new block with generated ID', async () => {
      const content = 'New block content';
      mockRepo.insert.mockResolvedValue(undefined);

      const result = await service.createBlock('2026-03-21', content);

      expect(result.id).toBeDefined();
      expect(result.docId).toBe('2026-03-21');
      expect(result.content).toBe(content);
      expect(mockRepo.insert).toHaveBeenCalled();
    });
  });
});
```

### 集成测试示例

```typescript
// __tests__/integration/editor-storage.test.ts
import Database from 'better-sqlite3';
import { Editor } from '@tiptap/core';
import { initSchema } from '../../db/schema';
import { saveBlocks, loadBlocks } from '../../services/block-persistence';

describe('Editor and Storage Integration', () => {
  let testDb: Database.Database;

  beforeEach(() => {
    testDb = new Database(':memory:');
    initSchema(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it('should persist editor content to database', async () => {
    const editor = new Editor({
      content: '<p>Hello World</p>',
    });

    const blocks = editor.getJSON().content;
    await saveBlocks(testDb, blocks);

    const loaded = await loadBlocks(testDb);
    expect(loaded[0].content).toContain('Hello World');
  });
});
```
