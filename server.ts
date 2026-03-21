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
    console.log('收到创建 block 请求:', req.body);
    const { docId, content, blockOrder } = req.body;
    const block = blockService.createBlock({ docId, content, blockOrder });
    console.log('创建 block 成功:', block);
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
}).on('error', (error) => {
  console.error('服务器启动失败:', error);
  process.exit(1);
});

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  console.error('未处理的异常:', error);
});

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (error) => {
  console.error('未处理的 Promise 拒绝:', error);
});
