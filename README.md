# Kar1n Tease Paradise

自制分支剧情文字冒险站点（Kar1n 调教乐园）。玩家注册账号、用专属秘钥解锁付费作品；管理员生成秘钥、管理用户、可视化编辑节点（图片 / 配音 / 视频）。支持作品 JSON 导入导出。首页文案可在后台「首页文案」修改。

数据库：**PostgreSQL**（Prisma）。上传文件走可配置的 `UPLOAD_DIR`（生产挂 Volume）。

---

## 本地开发

### 1. 启动 Postgres

```bash
docker compose up -d
```

默认连接串见 `.env.example`：

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/text_adventure"
SESSION_SECRET="至少32字符的随机串"
```

### 2. 安装与初始化

```bash
npm install
npx prisma migrate deploy
npm run db:seed
```

### 3. 双进程（推荐本机）

```bash
npm run dev
```

| 站点 | 地址 | 说明 |
|------|------|------|
| 玩家站 | http://www.kar1nteaseparadise.com （hosts→本机）或 http://127.0.0.1:3000 | `SITE_ROLE=player`，禁止 `/admin` |
| 管理端 | http://127.0.0.1:3001 | 仅本机 loopback，`SITE_ROLE=admin` |

hosts 可用 `scripts/add-hosts.bat`（管理员）写入玩家域名。

### 默认管理员

seed 创建用户名 `admin`。登录后立刻在管理端改密。界面不显示明文密码。

演示秘钥：`DEMO-ONCE-0001-TEST`（一次性）、`DEMO-PERM-0001-TEST`（永久）。

---

## Railway 公网部署

公网用**单一服务**（`SITE_ROLE=all`）：玩家走主域名首页；管理走同一域名的 `/admin`（仅管理员登录后可用）。不要再拆两个进程对外。

### 准备清单（本仓库已提供）

- `Dockerfile` + `railway.toml`：构建镜像，启动时 `prisma migrate deploy` + `next start -H 0.0.0.0:$PORT`
- `scripts/start-prod.mjs` / `scripts/build-prod.mjs`
- Prisma provider = `postgresql`，迁移目录 `prisma/migrations/`
- `UPLOAD_DIR`（默认生产 `/data/uploads`）

### 在 Railway 上创建（账号连好后）

1. **New Project** → 部署本目录（`railway up` 或 GitHub 连接）。
2. **Add PostgreSQL** 插件到同一项目；把 `DATABASE_URL` 引用到 Web 服务（Railway 通常自动注入，或手动 `${{Postgres.DATABASE_URL}}`）。
3. **Volume**：挂载到服务路径 `/data`（持久化上传）。变量：`UPLOAD_DIR=/data/uploads`。
4. **必填 / 推荐变量**：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Postgres 连接串（插件提供） |
| `SESSION_SECRET` | ≥32 字符随机串 |
| `SITE_ROLE` | `all`（公网单实例） |
| `UPLOAD_DIR` | `/data/uploads` |
| `PLAYER_SITE_URL` | 公网玩家 URL，如 `https://你的域名` |
| `ADMIN_SITE_URL` | 可同域名 `/admin`，如 `https://你的域名/admin` |

5. **域名**：Railway 生成 `*.up.railway.app`，或绑定自定义域名（如 `www.kar1nteaseparadise.com`）。HTTPS 由 Railway 提供。
6. 首次部署成功后执行一次 seed（可选）：`railway run npm run db:seed`（或 SSH/一次性 Job）。**立刻修改 admin 密码。**

### 本地验证生产入口（可选）

```bash
docker compose up -d
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/text_adventure"
export SESSION_SECRET="local-prod-test-secret-32chars!!"
export SITE_ROLE=all
export UPLOAD_DIR="$(pwd)/data/uploads"
npm run build:prod
npm run start:prod
```

---

## 媒体 URL

上传返回 `/uploads/games/<作品id>/<文件>`；`next.config` rewrite 到 `/api/media/...`，从 `UPLOAD_DIR`（或本地 `public/uploads`）读盘。

## 技术栈

- Next.js 14（App Router）+ TypeScript + Tailwind
- PostgreSQL + Prisma
- iron-session（`SESSION_SECRET`）
- bcryptjs

## 重置数据

```bash
npm run db:reset
```
