## 代码风格
- 使用 **2 空格缩进**。
- 变量命名采用 **camelCase**，类名采用 **PascalCase**。
- 所有 TypeScript 文件必须启用 **strict mode**。

```typescript
// ✅ 正确
const blockId: string = '123';
class BlockService { ... }

// ❌ 错误
const BlockId: string = '123';
```

## 禁止操作
- 禁止直接操作 DOM（如 `document.getElementById`），必须通过 **Tiptap API** 或 **React Refs**。
- 禁止在组件中直接执行 SQLite 查询，必须通过 **Service 层**。

```typescript
// ❌ 错误
document.querySelector('.block').innerHTML = '...';

// ✅ 正确
editor.commands.insertContent('...');
```

## 类型安全
- 函数必须显式声明返回类型。
- 禁止 `any` 类型，必须使用 `unknown` 或具体类型。

```typescript
// ✅ 正确
function getBlock(id: string): Block | null { ... }

// ❌ 错误
function getBlock(id: string): any { ... }
```

## 异步操作
- 异步函数必须返回 `Promise`，使用 `async/await`。
- 禁止回调函数（如 `fs.readFile(callback)`）。

```typescript
// ✅ 正确
async function loadBlocks(docId: string): Promise<Block[]> { ... }

// ❌ 错误
function loadBlocks(docId: string, callback: (blocks: Block[]) => void) { ... }
```