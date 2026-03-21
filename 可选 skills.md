

# 二、 SkillsMP 上适合您项目的现成 Skills
在 [SkillsMP](https://skillsmp.com/) 上，以下 **Agent Skills** 适合您的**双链大纲笔记软件项目**：
---

## 初略搜索
golang-developer 或 go-backend（来自 alirezarezvani/claude-skills 或 VoltAgent/awesome-agent-skills）
为什么适合：强制 Go 代码风格、事务处理、goroutine 安全、Fiber/chi 路由、SQLite modernc 驱动使用
搜索关键词：golang developer / go backend scalability
安装后 AI 会自动用 gofmt、errors.Join、事务包裹写操作

react-expert 或 react-typescript-best-practices（jeffallan-claude-skills 或 Vercel 官方的 react-best-practices）
为什么适合：React 组件层次、state 管理、TypeScript 严格类型、shadcn/ui 或 Tailwind 风格（你可改成 BlockSuite）
搜索：react expert / react typescript / vercel react best practices
特别有用：帮你写 BlockSuite 集成代码时不会乱用 useState

fullstack-engineer 或 senior-fullstack（davila7/claude-code-templates 中的 senior-architect / senior-backend 变体）
为什么适合：前后端协作、API 设计、SQLite 事务 + WebSocket 实时同步
搜索：fullstack engineer / senior fullstack / go react fullstack

sqlite / database-admin / database-optimizer（多个来源都有）
为什么适合：强制用事务、CTE 递归查询（你的反链层级）、FTS5 全文索引、RANDOM() 随机查询
搜索：sqlite / database optimizer / sqlite expert

frontend-architect 或 react-native-best-practices（Callstack / Vercel 变体）
为什么适合：组件设计、拖拽（React DnD）、PWA 配置、响应式布局
搜索：frontend architect / react best practices

coding-agent（openclaw/openclaw-skills）
为什么适合：让 AI 把复杂任务拆给子 agent（比如“先写后端 BlockRepo，再写前端拖拽”）
搜索：coding agent

websocket-engineer（少见但有）
为什么适合：你的拖拽、反链实时更新必须用 WS
搜索：websocket engineer


## 印象中可用的skills

### 1. **前端开发 Skills**
| Skill 名称                     | 描述                                                                 | 适用场景                                  |
|--------------------------------|----------------------------------------------------------------------|------------------------------------------|
| **React + TypeScript Boilerplate** | 生成 React + TypeScript 项目骨架，包含 ESLint、Prettier、Jest。   | 项目初始化                              |
| **Tiptap Extension Generator**  | 自动生成 Tiptap 扩展（如大纲、双向链接）。                            | 实现编辑器功能                          |
| **Drag-and-Drop for React**     | 实现 React 拖拽功能（如大纲节点排序）。                              | 大纲折叠/拖拽                          |
| **Markdown to HTML Converter**  | 将 Markdown 转换为 HTML（用于预览）。                              | 笔记渲染                              |
| **PWA Setup for React**         | 配置 React PWA（manifest、service worker）。                        | 移动端适配                            |

**安装命令**：
```bash
skillsmp install "React + TypeScript Boilerplate"
skillsmp install "Tiptap Extension Generator"
```

---

### 2. **后端/数据库 Skills**
| Skill 名称                     | 描述                                                                 | 适用场景                                  |
|--------------------------------|----------------------------------------------------------------------|------------------------------------------|
| **SQLite Schema Designer**     | 生成 SQLite 表结构和索引。                                          | 数据库初始化                            |
| **TypeORM Entity Generator**   | 生成 TypeORM 实体类（如 `BlockEntity`）。                            | 数据层开发                              |
| **SQL Query Optimizer**        | 优化 SQLite 查询（如反链分页）。                                    | 性能优化                                |
| **Dockerfile for Node.js**      | 生成 Node.js + SQLite 的 Dockerfile。                              | 自托管部署                              |

**安装命令**：
```bash
skillsmp install "SQLite Schema Designer"
skillsmp install "Dockerfile for Node.js"
```

---

### 3. **测试 Skills**
| Skill 名称                     | 描述                                                                 | 适用场景                                  |
|--------------------------------|----------------------------------------------------------------------|------------------------------------------|
| **Jest Unit Test Generator**   | 生成 Jest 单元测试（如 `BlockService.test.ts`）。                     | 服务层测试                              |
| **Cypress E2E Test Setup**     | 配置 Cypress 端到端测试（如编辑器交互）。                              | UI 测试                                 |
| **SQLite Test Data Generator** | 生成测试数据（如模拟数万块）。                                        | 性能测试                                |

**安装命令**：
```bash
skillsmp install "Jest Unit Test Generator"
skillsmp install "Cypress E2E Test Setup"
```

---

### 4. **部署/DevOps Skills**
| Skill 名称                     | 描述                                                                 | 适用场景                                  |
|--------------------------------|----------------------------------------------------------------------|------------------------------------------|
| **Docker Compose for SQLite**  | 生成 SQLite 持久化的 `docker-compose.yml`。                         | Docker 部署                            |
| **GitHub Actions CI/CD**       | 配置 CI/CD 流水线（测试、构建、部署）。                              | 自动化部署                              |
| **Nginx Config for SPA**        | 生成 Nginx 配置（用于静态文件服务）。                                | Web 服务器配置                          |

**安装命令**：
```bash
skillsmp install "Docker Compose for SQLite"
skillsmp install "GitHub Actions CI/CD"
```

---

### 5. **AI 辅助开发 Skills**
| Skill 名称                     | 描述                                                                 | 适用场景                                  |
|--------------------------------|----------------------------------------------------------------------|------------------------------------------|
| **GitHub Copilot Prompts**      | 预定义的 Copilot 提示（如“生成 Tiptap 扩展”）。                      | 代码生成                                |
| **Code Review Assistant**      | 自动审查代码（如检查 Tiptap 扩展是否符合规范）。                      | 代码质量                                |
| **Documentation Generator**    | 生成 Markdown 文档（如 API 文档）。                                  | 项目文档                                |

**安装命令**：
```bash
skillsmp install "GitHub Copilot Prompts"
skillsmp install "Documentation Generator"
```

---

## 三、 如何按需激活 Rules 和 Skills？
### 1. **Trae Rules 按需激活**
Trae 支持**按目录或文件类型激活规则**。例如：
- 在 `extensions/` 目录下仅激活 `rules/tiptap.md`：
  ```yaml
  # .trae/config.yml
  rules:
    - path: "extensions/**"
      rules: ["rules/tiptap.md"]
    - path: "services/**"
      rules: ["rules/basic.md", "rules/sqlite.md"]
  ```

- 在特定情况下临时激活规则：
  ```bash
  trae lint --rules rules/sqlite.md  # 仅检查 SQLite 规则
  ```

---

### 2. **SkillsMP Skills 按需使用**
- **按功能模块安装**：
  例如，开发 **Tiptap 扩展** 时，仅安装相关 Skills：
  ```bash
  skillsmp install "Tiptap Extension Generator" "GitHub Copilot Prompts"
  ```

- **按开发阶段安装**：
  | 阶段          | 推荐 Skills                                      |
  |---------------|--------------------------------------------------|
  | 项目初始化    | React Boilerplate, SQLite Schema Designer       |
  | 编辑器开发    | Tiptap Extension Generator, Drag-and-Drop      |
  | 数据层开发    | TypeORM Entity Generator, SQL Query Optimizer   |
  | 测试          | Jest Unit Test Generator, Cypress E2E Test      |
  | 部署          | Docker Compose for SQLite, Nginx Config         |

---

## 四、 示例：结合 Trae Rules 和 SkillsMP 实现双向链接
**场景**：实现 `[[wikilinks]]` 的自动补全和反链存储。

### 1. **激活相关 Rules**
```yaml
# .trae/config.yml
rules:
  - path: "extensions/WikilinkExtension.ts"
    rules: ["rules/tiptap.md"]
  - path: "services/LinkService.ts"
    rules: ["rules/basic.md", "rules/sqlite.md"]
```

### 2. **安装 SkillsMP Skills**
```bash
skillsmp install "Tiptap Extension Generator" "SQLite Query Helper"
```

### 3. **使用 AI 生成代码**
**提示**：
```
Generate a Tiptap extension for bidirectional links with the following requirements:
1. Use `[[wikilinks]]` syntax.
2. Store backlinks in the `backlinks` SQLite table.
3. Support autocomplete when typing `[[`.
4. Follow the rules in `rules/tiptap.md` and `rules/sqlite.md`.

Use the installed SkillsMP skills for reference.
```

**AI 生成的代码**（自动应用规则）：
```typescript
// extensions/WikilinkExtension.ts
import { Mark } from '@tiptap/core';
import { LinkService } from '../services/LinkService';

export const WikilinkExtension = Mark.create({
  name: 'wikilink',
  inclusive: false,

  addOptions() {
    return {
      linkService: new LinkService(db),
      suggestion: {
        char: '[',
        command: ({ editor, range, props }) => {
          editor.commands.insertContent({
            type: 'text',
            text: `[[${props.id}|${props.title}]]`,
          });
          // 存储反链
          this.options.linkService.createLink(range.from, props.id);
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[href^="block:"]' }];
  },

  renderHTML({ mark }) {
    return ['a', { href: `block:${mark.attrs.id}`, class: 'wikilink' }, 0];
  },
});
```

```typescript
// services/LinkService.ts
export class LinkService {
  constructor(private db: Database) {}

  async createLink(sourceId: string, targetId: string) {
    await this.db.prepare(
      'INSERT OR IGNORE INTO backlinks (block_id, target_id) VALUES (?, ?)'
    ).run(sourceId, targetId);
  }

  async getBacklinks(targetId: string, limit = 20) {
    return this.db.prepare(
      'SELECT * FROM backlinks WHERE target_id = ? LIMIT ?'
    ).all(targetId, limit);
  }
}
```

---
## 五、 总结
| 类型          | 配置文件/工具               | 作用                                  |
|---------------|-----------------------------|---------------------------------------|
| **Trae Rules** | `rules/basic.md`            | 基础代码规范                          |
|               | `rules/tiptap.md`           | Tiptap 扩展规范                       |
|               | `rules/sqlite.md`           | SQLite 查询规范                       |
| **SkillsMP**   | React + TypeScript Boilerplate | 项目初始化                          |
|               | Tiptap Extension Generator  | 生成 Tiptap 扩展                     |
|               | SQLite Schema Designer      | 生成数据库表结构                      |
|               | Docker Compose for SQLite   | 生成 Docker 配置                     |

