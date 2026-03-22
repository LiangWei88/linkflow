# LinkFlow

一个双链大纲笔记应用，支持无限层级嵌套、双向链接、Daily Notes 和自托管部署。

## 项目简介

LinkFlow 是一款面向知识工作者的双链大纲笔记工具，灵感来源于 Roam Research、Logseq 和 Obsidian。采用轻量级分层架构，支持自托管部署，数据完全由用户掌控。

> ⚠️ **注意**：项目目前处于早期开发阶段，功能尚不完善，存在较多 Bug，不建议用于生产环境。欢迎尝鲜体验和参与开发！

## 功能特性

### 已实现

- **大纲编辑器** ✅
  - 无限层级嵌套
  - 点击即编辑（无感编辑体验）
  - 键盘导航（方向键跨 block 导航）
  - Tab 缩进 / Shift+Tab 取消缩进
  - Enter 拆分 block
  - 折叠/展开子节点
  - 多行文本支持
  - 中文输入法支持

### 开发中

- **双向链接** 🚧
  - Wikilink 语法 `[[页面名称]]`
  - 自动补全
  - 反链面板
  - 拖拽引用

- **Daily Notes** 🚧
  - 自动创建每日笔记
  - 模板系统
  - 日期导航

- **搜索与导航** 🚧
  - 全文搜索（FTS5）
  - 快速跳转（Ctrl+P）
  - 最近访问记录

## 技术架构

```
┌─────────────────────────────────────────┐
│                 UI 层                    │
│         React + TypeScript              │
│         Tailwind CSS                    │
├─────────────────────────────────────────┤
│              前端应用层                   │
│         Services + API 客户端            │
├─────────────────────────────────────────┤
│              服务端层                    │
│         Express + Node.js               │
├─────────────────────────────────────────┤
│                数据层                    │
│         SQLite + better-sqlite3         │
└─────────────────────────────────────────┘
```

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | React | 18+ |
| 构建 | Vite | 5.x |
| 服务端 | Express | 4.x |
| 数据库 | SQLite | 3.x |
| 样式 | Tailwind CSS | 3.x |
| 类型 | TypeScript | 5.x |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/linkflow.git
cd linkflow

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 开发

```bash
# 启动前端开发服务器
npm run dev

# 启动服务端（开发模式）
npm run server:dev

# 运行测试
npm test

# 类型检查
npx tsc --noEmit
```

## 项目结构

```
linkflow/
├── src/
│   ├── components/          # React 组件
│   │   └── outline/         # 大纲编辑器组件
│   │       ├── types.ts
│   │       ├── cursor.ts
│   │       ├── BlockEditor.tsx
│   │       ├── OutlineItem.tsx
│   │       ├── useCursorNavigation.ts
│   │       └── OutlineEditor.tsx
│   ├── data/                # Mock 数据
│   ├── db/                  # 数据库
│   ├── services/            # 业务逻辑
│   ├── repositories/        # 数据访问层
│   ├── types/               # 类型定义
│   └── api/                 # API 客户端
├── docs/                    # 文档
├── server.ts                # Express 服务端
└── README.md
```

## 开发计划

### Week 1-2: 基础架构 ✅
- [x] 项目骨架搭建
- [x] 数据层实现
- [x] 基础编辑器集成

### Week 3-4: 核心功能 🚧
- [x] 大纲编辑器
- [ ] 双向链接

### Week 5-6: 功能完善
- [ ] Daily Notes
- [ ] 搜索功能
- [ ] 反链面板

### Week 7-8: 部署优化
- [ ] Docker 部署
- [ ] PWA 适配

## 文档

- [开发计划](./docs/开发计划.md)
- [需求文档](./docs/需求文档.md)
- [架构设计](./docs/架构设计.md)
- [API 接口文档](./docs/API接口文档.md)
- [数据库设计](./docs/数据库设计.md)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
