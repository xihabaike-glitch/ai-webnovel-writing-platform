# 部署说明：单用户本地优先

本项目是单用户、local-first 的写作工作台，默认只适合在自己的电脑上使用。它默认绑定到 `127.0.0.1`，不会向局域网或公网发布服务。

不要把应用、Docker 端口或反向代理直接公开到公网。若确有远程访问需求，必须先在应用外部部署可靠的身份认证层和 HTTPS，并自行评估数据、模型凭据和 SQLite 文件的风险。

## Docker 一键启动

安装 Docker Desktop 和 Node.js 22 后，在项目根目录运行一次安全初始化：

```bash
npm run env:ensure-secret
docker compose up -d
```

打开：

```txt
http://localhost:3000
```

Docker 会安装依赖、构建应用、部署已提交的 Prisma migration、首次写入演示数据，并将 SQLite 数据保存在 Docker volume 中。端口映射为 `127.0.0.1:${APP_PORT:-3000}:3000`；需要改本机端口时运行：

```bash
APP_PORT=3001 docker compose up -d
```

`MODEL_CREDENTIAL_SECRET` 是随机生成并写入本机 `.env` 的凭据保护密钥。`npm run env:ensure-secret` 会在 `.env` 缺失时从 `.env.example` 创建它，修复空值或无效值，并且不会打印密钥。不要提交、公开或随意替换它；需要迁移机器时，应通过安全渠道一并迁移该 `.env` 文件。

## 本地启动

需要 Node.js 22 LTS 和 npm：

```bash
npm run env:ensure-secret
npm install
npm run db:seed
npm run local:start
```

本地 `dev` 和 `start` 默认监听 `127.0.0.1`。打开 `http://localhost:3000`。

## 数据库升级与旧库基线

正常启动和升级使用 `prisma migrate deploy`，只应用仓库中已提交的 migration。空数据库会先应用 `20260710090000_initial`，再应用 `20260710100000_repair_chapter_and_task_consistency`。

**警告：任何升级或基线操作前，都必须备份 SQLite 数据库并验证备份可恢复。** 本地默认备份 `prisma/dev.db`；Docker 请备份对应的 `webnovel-data` volume。

一次性旧库基线只适用于同时满足以下条件的数据库：

1. 它由早期版本的 `prisma db push` 创建。
2. 它已有业务表，但没有 `_prisma_migrations` 历史。
3. 它的 schema 对应修复 migration 之前的版本。

基线脚本不会运行 `prisma db push`。它先以只读方式验证完整的旧版表、列、外键和索引，并拒绝空库、漂移 schema 或不兼容的 `_prisma_migrations` 历史；只有验证通过的旧库才会将初始 migration 标记为已应用，然后立即通过 `migrate deploy` 应用修复 migration。本地执行：

```bash
DATABASE_BASELINE=1 BASELINE_MIGRATION=20260710090000_initial npm run db:baseline
```

Docker 使用同一条显式路径：

```bash
DATABASE_BASELINE=1 BASELINE_MIGRATION=20260710090000_initial docker compose up -d
```

如果参数不是精确的初始 migration 名称，脚本会拒绝执行。若容器在初始 migration 已记录后重启，脚本会跳过重复 resolve 并继续执行 `migrate deploy`；修复 migration 已应用时可安全 no-op。完成后移除 `DATABASE_BASELINE` 和 `BASELINE_MIGRATION`，后续升级继续使用默认的 `migrate deploy`。

## 质量检查与镜像更新

提交前运行：

```bash
npm run check
npm run test:compose-config
```

`npm run check` 在没有 `.env` 的 clean clone 中会为 Prisma 验证使用本地临时 SQLite URL。测试套件会真实部署空 SQLite 数据库，并重演旧库基线。`npm run test:compose-config` 需要 Docker，用于验证两个基线环境变量确实传入容器。

CI 还会执行生产依赖审计。Docker 基础镜像固定为 `node:22-bookworm-slim` 的 digest。更新时，先用 `docker buildx imagetools inspect node:22-bookworm-slim` 取得新的多架构 digest，修改 `Dockerfile`，然后运行 `docker compose build` 和 `npm run check`。
