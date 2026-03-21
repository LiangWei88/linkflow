---
name: deploy
description: 编写 Dockerfile、docker-compose、Nginx 配置、部署脚本时触发。包含多阶段构建、数据持久化和环境变量规范。
---

# deploy

## 命令

```bash
docker build -t linkflow .          # 构建镜像
docker-compose up -d                # 启动服务
docker-compose down                 # 停止服务
docker logs linkflow                # 查看日志
```

## 使用场景

- 编写 Dockerfile
- 配置 docker-compose.yml
- 编写 Nginx 配置
- 设置环境变量
- 配置数据持久化

## 输出解释

### Docker 配置

所有服务必须使用**多阶段构建**，减小镜像体积：

```dockerfile
# ✅ 正确
FROM node:18 as builder
WORKDIR /app
COPY . .
RUN yarn install --production
RUN yarn build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .
CMD ["yarn", "start"]
```

### 数据持久化

SQLite 数据必须持久化到 **Docker Volume**：

```yaml
# ✅ 正确
volumes:
  - ./data:/app/data
```

### 环境变量

所有配置必须通过**环境变量**注入：

```dockerfile
ENV DB_PATH=/app/data/notes.db
ENV PORT=3000
```

### Nginx 配置

前端静态文件必须配置**缓存**和**gzip 压缩**：

```nginx
server {
  listen 80;
  location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;
    gzip on;
    expires 1d;
  }
}
```

## 示例

### 完整的 docker-compose.yml 示例

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - DB_PATH=/app/data/notes.db
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./dist:/usr/share/nginx/html:ro
    depends_on:
      - app
    restart: unless-stopped
```

### 完整的 Dockerfile 示例

```dockerfile
# 构建阶段
FROM node:18 as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# 生产阶段
FROM node:18-alpine
WORKDIR /app

# 安装 tini 作为 init 进程
RUN apk add --no-cache tini

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# 创建数据目录
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

ENV DB_PATH=/app/data/notes.db
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
```
