---
name: github-actions
description: GitHub Actions CI/CD 配置。包含自动化测试、Docker 镜像构建、部署到服务器。
---

# github-actions

## 命令

```bash
gh workflow list              # 列出所有工作流
gh workflow run ci.yml        # 手动触发工作流
gh workflow view ci.yml       # 查看工作流配置
```

## 使用场景

- 配置自动化测试流程
- 设置 Docker 镜像自动构建
- 配置自动化部署到服务器
- 监控 CI/CD 流程状态

## 输出解释

### 工作流结构

GitHub Actions 工作流由以下部分组成：

1. **触发条件**（on）
   - push 到特定分支
   - pull request
   - 手动触发（workflow_dispatch）

2. **任务**（jobs）
   - test：运行测试
   - build：构建 Docker 镜像
   - deploy：部署到服务器

3. **步骤**（steps）
   - 检出代码
   - 安装依赖
   - 运行测试
   - 构建镜像
   - 推送镜像
   - 部署

### 最佳实践

- ✅ 使用缓存加速构建（`actions/cache`）
- ✅ 并行运行独立的任务
- ✅ 使用环境变量和 Secrets 存储敏感信息
- ✅ 添加失败通知
- ✅ 使用矩阵策略测试多个版本

## 示例

### 完整的 CI/CD 工作流

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:

env:
  NODE_VERSION: '18'
  DOCKER_IMAGE: 'linkflow/notes'

jobs:
  # 测试任务
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run typecheck

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # 构建任务
  build:
    name: Build Docker Image
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.DOCKER_IMAGE }}:latest
            ${{ env.DOCKER_IMAGE }}:${{ github.sha }}
          cache-from: type=registry,ref=${{ env.DOCKER_IMAGE }}:buildcache
          cache-to: type=registry,ref=${{ env.DOCKER_IMAGE }}:buildcache,mode=max

  # 部署任务
  deploy:
    name: Deploy to Server
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app/linkflow
            docker-compose pull
            docker-compose up -d
            docker image prune -f

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: '部署完成！'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

### 简化的测试工作流

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16, 18, 20]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

### 定时任务工作流

```yaml
name: Scheduled Tasks

on:
  schedule:
    - cron: '0 0 * * *'  # 每天午夜运行
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup database
        run: |
          echo "Running database backup..."
          # 备份逻辑
```

### Secrets 配置

在 GitHub 仓库设置中配置以下 Secrets：

| Secret 名称 | 描述 | 示例 |
|-------------|------|------|
| `DOCKER_USERNAME` | Docker Hub 用户名 | `your-username` |
| `DOCKER_PASSWORD` | Docker Hub 密码 | `your-password` |
| `SERVER_HOST` | 服务器地址 | `192.168.1.100` |
| `SERVER_USER` | 服务器用户名 | `ubuntu` |
| `SSH_PRIVATE_KEY` | SSH 私钥 | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SLACK_WEBHOOK` | Slack 通知 Webhook | `https://hooks.slack.com/...` |

### 环境变量配置

```yaml
env:
  NODE_ENV: production
  DB_PATH: /app/data/notes.db
  PORT: 3000
```

### 缓存配置

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```
