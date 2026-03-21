---
name: tiptap-extension
description: 开发 Tiptap 扩展、自定义 Node/Mark、配置编辑器扩展时触发。包含命名规范、扩展结构和事件处理规范。
---

# tiptap-extension

## 命令

无命令行工具，作为编码规范在开发 Tiptap 扩展时自动应用。

## 使用场景

- 创建新的 Tiptap 扩展
- 自定义 Node 或 Mark 类型
- 配置编辑器扩展选项
- 处理编辑器事件和交互
- 实现 parseHTML/renderHTML

## 输出解释

### 扩展命名

- 所有自定义扩展必须以 **`Extension`** 结尾，如 `WikilinkExtension`
- 扩展文件必须放在 `/extensions/` 目录下

```typescript
// ✅ 正确
// extensions/WikilinkExtension.ts
export const WikilinkExtension = Mark.create({ ... });
```

### 扩展结构

每个扩展必须导出 **`addOptions`** 方法，并支持 **`parseHTML`** 和 **`renderHTML`**：

```typescript
export const OutlineExtension = Node.create({
  name: 'outline',
  addOptions() { return { levels: [1, 2, 3] }; },
  parseHTML() { return [{ tag: 'li[data-outline]' }]; },
  renderHTML() { return ['li', { 'data-outline': true }, 0]; },
});
```

### 依赖管理

禁止在扩展中直接导入 **React** 或 **DOM API**，必须通过 **Tiptap 提供的依赖**：

```typescript
// ✅ 正确
import { Node } from '@tiptap/core';

// ❌ 错误
import React from 'react';
```

### 事件处理

所有用户交互必须通过 **Tiptap 的 `Plugin`** 处理，禁止直接绑定 DOM 事件：

```typescript
// ✅ 正确
new Plugin({
  props: {
    handleClick: () => { ... },
  },
});
```

## 示例

### 完整的 Wikilink 扩展示例

```typescript
// extensions/WikilinkExtension.ts
import { Mark, mergeAttributes } from '@tiptap/core';

export interface WikilinkOptions {
  linkClass: string;
  suggestionChar: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikilink: {
      setWikilink: (target: string) => ReturnType;
      unsetWikilink: () => ReturnType;
    };
  }
}

export const WikilinkExtension = Mark.create<WikilinkOptions>({
  name: 'wikilink',

  addOptions() {
    return {
      linkClass: 'wikilink',
      suggestionChar: '[',
    };
  },

  parseHTML() {
    return [{ tag: `a[data-wikilink]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        class: this.options.linkClass,
        'data-wikilink': true,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setWikilink:
        (target: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { 'data-target': target });
        },
      unsetWikilink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
```
