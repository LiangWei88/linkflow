---
name: code-review
description: 代码审查和质量检查。包含代码风格、SQLite 查询安全、Tiptap 扩展规范、TypeScript 类型检查。
---

# code-review

## 命令

```bash
npm run lint          # 运行 ESLint 检查
npm run typecheck     # 运行 TypeScript 类型检查
npm test              # 运行测试
```

## 使用场景

- 审查 Pull Request 时
- 代码提交前自检
- 发现代码质量问题时
- 确保符合项目规范时

## 输出解释

### 检查项

#### 1. 代码风格（basic.md）

- ✅ 使用 2 空格缩进
- ✅ 变量命名采用 camelCase，类名采用 PascalCase
- ✅ 所有 TypeScript 文件启用 strict mode

```typescript
// ✅ 正确
const blockId: string = '123';
class BlockService { ... }

// ❌ 错误
const BlockId: string = '123';
```

#### 2. 禁止操作（basic.md）

- ❌ 禁止直接操作 DOM（如 `document.getElementById`）
- ❌ 禁止在组件中直接执行 SQLite 查询

```typescript
// ❌ 错误
document.querySelector('.block').innerHTML = '...';

// ✅ 正确
editor.commands.insertContent('...');
```

#### 3. 类型安全（basic.md）

- ✅ 函数必须显式声明返回类型
- ❌ 禁止 `any` 类型，使用 `unknown` 或具体类型

```typescript
// ✅ 正确
function getBlock(id: string): Block | null { ... }

// ❌ 错误
function getBlock(id: string): any { ... }
```

#### 4. 异步操作（basic.md）

- ✅ 异步函数返回 `Promise`，使用 `async/await`
- ❌ 禁止回调函数

```typescript
// ✅ 正确
async function loadBlocks(docId: string): Promise<Block[]> { ... }

// ❌ 错误
function loadBlocks(docId: string, callback: (blocks: Block[]) => void) { ... }
```

#### 5. SQLite 查询安全（sqlite.md）

- ✅ 所有查询使用参数化语句
- ❌ 禁止字符串拼接

```typescript
// ✅ 正确
const blocks = db.prepare('SELECT * FROM blocks WHERE doc_id = ?').all(docId);

// ❌ 错误
const blocks = db.prepare(`SELECT * FROM blocks WHERE doc_id = '${docId}'`).all();
```

#### 6. 索引使用（sqlite.md）

- ✅ 查询 `blocks` 表时使用 `doc_id` 或 `parent_id` 索引
- ✅ 反链查询限制结果数量（如 `LIMIT 20`）

```typescript
// ✅ 正确
const backlinks = db.prepare(
  'SELECT * FROM backlinks WHERE target_id = ? LIMIT 20'
).all(targetId);
```

#### 7. 事务管理（sqlite.md）

- ✅ 所有写操作使用事务

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

#### 8. Tiptap 扩展规范（tiptap.md）

- ✅ 扩展以 `Extension` 结尾
- ✅ 扩展文件放在 `/extensions/` 目录
- ✅ 导出 `addOptions` 方法
- ✅ 支持 `parseHTML` 和 `renderHTML`
- ❌ 禁止直接导入 React 或 DOM API

```typescript
// ✅ 正确
import { Node } from '@tiptap/core';

export const OutlineExtension = Node.create({
  name: 'outline',
  addOptions() { return { levels: [1, 2, 3] }; },
  parseHTML() { return [{ tag: 'li[data-outline]' }]; },
  renderHTML() { return ['li', { 'data-outline': true }, 0]; },
});

// ❌ 错误
import React from 'react';
```

## 示例

### 代码审查报告示例

```markdown
# 代码审查报告

## ✅ 通过项

- 代码风格：符合 2 空格缩进和命名规范
- 类型安全：函数返回类型声明完整
- 异步操作：正确使用 async/await

## ⚠️ 警告项

- **缺少错误处理**：建议添加 try-catch 处理数据库错误

```typescript
// 当前代码
await db.prepare('INSERT INTO blocks VALUES (?, ?, ?)').run(id, docId, content);

// 建议修改
try {
  await db.prepare('INSERT INTO blocks VALUES (?, ?, ?)').run(id, docId, content);
} catch (error) {
  console.error('Failed to insert block:', error);
  throw error;
}
```

## ❌ 问题项

- **SQL 注入风险**：使用了字符串拼接

```typescript
// 当前代码（危险）
const blocks = db.prepare(`SELECT * FROM blocks WHERE doc_id = '${docId}'`).all();

// 建议修改
const blocks = db.prepare('SELECT * FROM blocks WHERE doc_id = ?').all(docId);
```

- **缺少索引使用**：反链查询未限制结果数量

```typescript
// 当前代码
const backlinks = db.prepare(
  'SELECT * FROM backlinks WHERE target_id = ?'
).all(targetId);

// 建议修改
const backlinks = db.prepare(
  'SELECT * FROM backlinks WHERE target_id = ? LIMIT 20'
).all(targetId);
```

## 📋 改进建议

1. 添加单元测试覆盖核心功能
2. 为公共 API 添加 TypeDoc 注释
3. 考虑添加日志记录以便调试
```

### 自动化检查脚本示例

```bash
#!/bin/bash

echo "🔍 开始代码审查..."

# 1. ESLint 检查
echo "📝 运行 ESLint..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ ESLint 检查失败"
  exit 1
fi

# 2. TypeScript 类型检查
echo "🔧 运行 TypeScript 类型检查..."
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ 类型检查失败"
  exit 1
fi

# 3. 运行测试
echo "🧪 运行测试..."
npm test
if [ $? -ne 0 ]; then
  echo "❌ 测试失败"
  exit 1
fi

echo "✅ 代码审查通过！"
```
