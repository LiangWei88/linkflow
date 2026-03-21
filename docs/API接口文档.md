# API 接口文档

**版本**: 1.1  
**日期**: 2026-03-21  
**说明**: 前后端分离架构，使用 Express 实现 RESTful API

---

## 1. 概述

本文档定义应用的 RESTful API 接口规范。项目采用前后端分离架构：

- **前端**: React + TypeScript + Tiptap
- **后端**: Express + SQLite
- **通信**: HTTP RESTful API

---

## 2. API 基础信息

### 2.1 基础 URL

```
http://localhost:3001/api
```

### 2.2 请求方法

- `GET`: 获取资源
- `POST`: 创建资源
- `PUT`: 更新资源
- `DELETE`: 删除资源

### 2.3 响应格式

所有 API 响应都使用统一的 JSON 格式：

```json
{
  "success": true,      // 是否成功
  "data": {},          // 响应数据
  "error": "错误信息"  // 错误信息（仅当 success 为 false 时）
}
```

### 2.4 错误状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 3. 块服务 API

### 3.1 获取文档的所有 blocks

**接口**: `GET /api/blocks/:docId`

**参数**:
- `docId`: 文档 ID（路径参数）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "block_123",
      "docId": "test-doc",
      "content": "内容",
      "blockOrder": 0,
      "createdAt": "2026-03-21T00:00:00.000Z",
      "updatedAt": "2026-03-21T00:00:00.000Z"
    }
  ]
}
```

### 3.2 获取单个 block

**接口**: `GET /api/block/:id`

**参数**:
- `id`: Block ID（路径参数）

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "block_123",
    "docId": "test-doc",
    "content": "内容",
    "blockOrder": 0,
    "createdAt": "2026-03-21T00:00:00.000Z",
    "updatedAt": "2026-03-21T00:00:00.000Z"
  }
}
```

### 3.3 创建 block

**接口**: `POST /api/blocks`

**请求体**:
```json
{
  "docId": "test-doc",
  "content": "内容",
  "blockOrder": 0
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "block_123",
    "docId": "test-doc",
    "content": "内容",
    "blockOrder": 0,
    "createdAt": "2026-03-21T00:00:00.000Z",
    "updatedAt": "2026-03-21T00:00:00.000Z"
  }
}
```

### 3.4 更新 block

**接口**: `PUT /api/block/:id`

**参数**:
- `id`: Block ID（路径参数）

**请求体**:
```json
{
  "content": "更新后的内容",
  "blockOrder": 1
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "block_123",
    "docId": "test-doc",
    "content": "更新后的内容",
    "blockOrder": 1,
    "createdAt": "2026-03-21T00:00:00.000Z",
    "updatedAt": "2026-03-21T00:00:00.000Z"
  }
}
```

### 3.5 删除 block

**接口**: `DELETE /api/block/:id`

**参数**:
- `id`: Block ID（路径参数）

**响应**:
```json
{
  "success": true,
  "data": true
}
```

---

## 4. 前端 API 客户端

前端使用封装的 API 客户端来调用后端接口：

```typescript
// src/api/client.ts
import type { Block, BlockCreate, BlockUpdate } from '../types/block';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  async getBlocks(docId: string): Promise<Block[]> {
    const response = await this.request<Block[]>(`/blocks/${docId}`);
    return response.data || [];
  }

  async getBlock(id: string): Promise<Block | null> {
    const response = await this.request<Block>(`/block/${id}`);
    return response.data || null;
  }

  async createBlock(block: BlockCreate): Promise<Block> {
    const response = await this.request<Block>('/blocks', {
      method: 'POST',
      body: JSON.stringify(block),
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || '创建失败');
    }
    return response.data;
  }

  async updateBlock(id: string, updates: BlockUpdate): Promise<Block | null> {
    const response = await this.request<Block>(`/block/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data || null;
  }

  async deleteBlock(id: string): Promise<boolean> {
    const response = await this.request<boolean>(`/block/${id}`, {
      method: 'DELETE',
    });
    return response.data || false;
  }
}

export const apiClient = new ApiClient();
```

**使用示例**:

```typescript
// 加载文档的所有 blocks
const blocks = await apiClient.getBlocks('test-doc');

// 创建新 block
const newBlock = await apiClient.createBlock({
  docId: 'test-doc',
  content: '新内容',
});

// 更新 block
await apiClient.updateBlock(blockId, {
  content: '更新后的内容',
});
```

---

## 5. 服务端实现

服务端使用 Express 实现 RESTful API：

```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import { blockService } from './src/services/BlockService';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 获取文档的所有 blocks
app.get('/api/blocks/:docId', (req, res) => {
  try {
    const { docId } = req.params;
    const blocks = blockService.getBlocks(docId);
    res.json({ success: true, data: blocks });
  } catch (error) {
    console.error('获取 blocks 失败:', error);
    res.status(500).json({ success: false, error: '获取数据失败' });
  }
});

// 获取单个 block
app.get('/api/block/:id', (req, res) => {
  try {
    const { id } = req.params;
    const block = blockService.getBlock(id);
    if (block) {
      res.json({ success: true, data: block });
    } else {
      res.status(404).json({ success: false, error: 'Block 不存在' });
    }
  } catch (error) {
    console.error('获取 block 失败:', error);
    res.status(500).json({ success: false, error: '获取数据失败' });
  }
});

// 创建 block
app.post('/api/blocks', (req, res) => {
  try {
    const { docId, content, blockOrder } = req.body;
    const block = blockService.createBlock({ docId, content, blockOrder });
    res.json({ success: true, data: block });
  } catch (error) {
    console.error('创建 block 失败:', error);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

// 更新 block
app.put('/api/block/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const block = blockService.updateBlock(id, updates);
    if (block) {
      res.json({ success: true, data: block });
    } else {
      res.status(404).json({ success: false, error: 'Block 不存在' });
    }
  } catch (error) {
    console.error('更新 block 失败:', error);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

// 删除 block
app.delete('/api/block/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = blockService.deleteBlock(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('删除 block 失败:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## 6. 数据模型

### 6.1 Block 类型

```typescript
// src/types/block.ts
export interface Block {
  id: string;
  docId: string;
  content: string;
  blockOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlockCreate {
  docId: string;
  content: string;
  blockOrder?: number;
}

export interface BlockUpdate {
  content?: string;
  blockOrder?: number;
}
```

---

## 7. 部署说明

### 7.1 启动服务端

```bash
# 安装依赖
npm install

# 启动服务端
npx tsx server.ts

# 服务运行在 http://localhost:3001
```

### 7.2 启动前端

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 前端运行在 http://localhost:5173
```

---

## 8. 接口变更日志

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.1.0 | 2026-03-21 | 改为前后端分离架构，使用 Express 实现 RESTful API |
| 1.0.0 | 2026-03-21 | 初始版本 |

## 9. 相关文档

- [架构设计](./架构设计.md)
- [数据库设计](./数据库设计.md)
- [开发规范](./开发规范.md)
- [部署文档](./部署文档.md)
