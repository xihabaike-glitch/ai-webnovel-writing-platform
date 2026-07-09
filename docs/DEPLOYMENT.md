# 部署说明（可选）

如果你只是想试用产品，优先看 README 里的“一键启动”。本文写给想自己部署或长期运行的人。

## 方式一：Docker 一键启动（推荐）

适合大多数用户。你只需要先安装 Docker Desktop。

在项目根目录运行：

```bash
docker compose up
```

启动后打开：

```txt
http://localhost:3000
```

Docker 会自动完成：

1. 安装依赖。
2. 构建网页应用。
3. 初始化 SQLite 数据库。
4. 首次运行时写入演示数据。
5. 启动网页服务。

数据会保存在 Docker volume 里，不会因为关闭窗口就丢失。

常用命令：

```bash
docker compose up
docker compose up -d
docker compose down
```

如果你想重新初始化演示数据，可以先删除 Docker volume，再重新启动。注意：这会删除本地数据。

## 方式二：本地一键脚本

适合已经安装 Node.js 的用户。

你需要：

1. Node.js 22 LTS。
2. npm。

首次准备：

```bash
npm run setup
```

启动应用：

```bash
npm run local:start
```

打开：

```txt
http://localhost:3000
```

`npm run setup` 会自动：

1. 创建 `.env`。
2. 安装依赖。
3. 初始化 SQLite 数据库。
4. 写入演示数据。

`npm run local:start` 会在需要时自动构建应用，然后启动本地服务。

## 方式三：云服务器部署

适合想把项目长期放在自己服务器上的用户。

推荐环境：

1. Ubuntu 22.04 / 24.04。
2. Node.js 22 LTS。
3. npm。
4. 持久磁盘。

部署步骤：

```bash
cp .env.example .env
npm install
npm run db:seed
npm run build
npm run start
```

默认端口：

```txt
3000
```

如果你使用云服务器，可以再用反向代理把域名指向 `3000` 端口。这里不展开服务器账号、域名、证书和私有部署细节。

## 关于数据库

当前版本默认使用 SQLite：

```bash
DATABASE_URL="file:./dev.db"
```

SQLite 适合：

1. 本地体验。
2. 个人使用。
3. 小团队试用。
4. Docker 单机部署。

如果你计划多人长期在线使用，后续建议迁移到 PostgreSQL。

## 关于 Vercel、Render、Railway

当前版本不建议直接把 SQLite 部署到 Serverless 平台，因为这类平台的本地文件存储不适合作为长期数据库。

如果要部署到 Vercel 这类平台，建议先做两件事：

1. 把数据库从 SQLite 切换到 PostgreSQL。
2. 使用 Neon、Supabase、Railway Postgres 等托管数据库。

## 不要上传这些内容

公开仓库不要提交：

1. `.env`
2. API Key
3. 服务器 IP
4. SSH 信息
5. 真实生产数据库文件
6. 私有域名和账号配置
