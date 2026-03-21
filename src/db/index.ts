import Database from 'better-sqlite3';
import { createTables } from './schema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库文件路径
const isTest = process.env.NODE_ENV === 'test';
const dbPath = isTest 
  ? path.resolve(__dirname, '../../data/test_linkflow.db')
  : path.resolve(__dirname, '../../data/linkflow.db');

// 初始化数据库
function initDatabase() {
  // 确保 data 目录存在
  const dataDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 创建数据库连接
  const db = new Database(dbPath);
  
  // 执行建表语句
  db.exec(createTables);
  
  return db;
}

// 导出数据库实例
export const db = initDatabase();
