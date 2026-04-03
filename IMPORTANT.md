# 灵工通 (Linggongtong) — 重要信息

> 最后更新：2026-04-03 18:36

---

## 📌 版本记录

| 版本 | Git Tag | Commit | 日期 | 说明 |
|------|---------|--------|------|------|
| v1.0-stable | `v1.0-stable` | `f07fee3` | 2026-04-03 | 本地开发环境完整版本，全部功能正常 |

### 恢复到指定版本

```bash
# 恢复到 v1.0-stable
git checkout v1.0-stable -- .

# 恢复后重启服务
cd server && npx prisma db push && npm run dev &
cd mcp-portal && npm run dev -- --port 3001 --host 0.0.0.0 &
npm run dev
```

---

## 🌐 本地服务地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 👷 自由职业者端 | http://localhost:3000/freelancer-app.html | 蓝色标题 + 3-Tab（任务广场/我的任务/我的） |
| 🏠 Portal 入口 | http://localhost:3000/portal/ | 四端选择页面 |
| 🤖 MCP Portal | http://localhost:3001/ | TimeLinker 控制台/沙盒（dev 模式无前缀） |
| 🤖 MCP 沙盒 | http://localhost:3001/console/sandbox | 直接进入沙盒测试 |
| 🔧 后端 API | http://localhost:3200 | Express + Prisma |
| 🔧 API 健康检查 | http://localhost:3200/api/health | 检查后端是否正常 |
| 🔌 MCP 端点 | http://localhost:3200/mcp | MCP 协议端点 |

---

## 🔑 登录凭证

### 自由职业者端 / 企业管理端
- **手机号**：任意 11 位手机号（如 `13800138000`、`13900000001`）
- **验证码**：开发环境固定为 `123456`
- **流程**：输入手机号 → 点击"获取验证码" → 输入 `123456` → 登录

### MCP Portal 管理后台
- **地址**：http://localhost:3001/admin
- **手机号**：`13800138000`
- **验证码**：`123456`

### MCP Portal 控制台（沙盒）
- 需要 API Key 登录
- API Key 可在管理后台创建或从数据库查询：
```bash
cd server && npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.mcpApp.findMany({ select: { name: true, apiKey: true } }).then(console.log);
"
```

---

## 🗄️ 数据库

| 项 | 值 |
|----|-----|
| 类型 | MySQL 9.3.0 |
| 地址 | localhost:3306 |
| 数据库名 | ktrack |
| 用户名 | ktrack |
| 密码 | KTrack2026Secure |

### 初始化数据库

```bash
cd server
npx prisma db push          # 同步 schema
npx tsx src/seed.ts          # 基础种子数据（企业 + 6个任务）
npx tsx src/seed-p3.ts       # 自由职业者 + 订单
npx tsx src/seed-p4.ts       # 发票数据
npx tsx src/seed-p5.ts       # 角色和消息
```

---

## 🚀 启动服务

```bash
# 1. 后端（必须先启动）
cd server && npm run dev

# 2. 主前端（Portal + Freelancer）
npm run dev

# 3. MCP Portal
cd mcp-portal && npm run dev -- --port 3001 --host 0.0.0.0
```

---

## 🏗️ 项目结构

```
linggongtong/
├── src/                        # 主前端源码
│   ├── App.tsx                 # Portal 入口（四端选择）
│   ├── apps/
│   │   ├── admin/              # 后台管理端
│   │   ├── enterprise/         # 企业管理端
│   │   └── website/            # 官网着陆页
│   └── index.css               # Tailwind CSS v4 入口（含 @source）
├── freelancer-app.html         # ⭐ 自由职业者端（独立 HTML，正式版本）
├── vite.config.ts              # 主 Vite 配置（含 /api 代理）
│
├── mcp-portal/                 # MCP Portal（独立 Vite 应用）
│   ├── src/
│   │   ├── pages/console/
│   │   │   └── Sandbox.tsx     # 沙盒测试页面
│   │   └── main.tsx            # basename 使用 import.meta.env.BASE_URL
│   └── vite.config.ts          # dev: base=/, build: base=/mcp-portal/
│
├── server/                     # 后端 API
│   ├── src/
│   │   ├── index.ts            # Express 入口
│   │   ├── mcp/mcpServer.ts    # MCP 协议服务
│   │   ├── routes/             # API 路由
│   │   └── seed*.ts            # 种子数据脚本
│   └── prisma/schema.prisma    # 数据库 schema
│
└── IMPORTANT.md                # 📌 本文件
```

---

## ⚙️ 关键配置说明

### Tailwind CSS v4
- 无 `tailwind.config.js` 文件
- 必须在 `src/index.css` 中加 `@source "../src";` 指令才能扫描源文件

### Vite 代理
- 主前端 `vite.config.ts`：`/api` 和 `/uploads` → `localhost:3200`
- MCP Portal `vite.config.ts`：`/api` 和 `/mcp` → `localhost:3200`

### MCP Portal base 路径
- **开发模式**：`base = '/'`，访问 `localhost:3001/`
- **构建部署**：`base = '/mcp-portal/'`，访问 `域名/mcp-portal/`

---

## 🌍 生产环境

| 项 | 值 |
|----|-----|
| 服务器 IP | 8.156.66.62 |
| 后端端口 | 3200 |
| Freelancer | http://8.156.66.62/freelancer/ |
| MCP Portal | http://8.156.66.62/mcp-portal/ |

---

## ⚠️ 常见问题

### 1. 页面样式全乱
**原因**：Tailwind CSS v4 未扫描到源文件
**解决**：确认 `src/index.css` 第二行是 `@source "../src";`

### 2. 数据库报错 `Unknown authentication plugin`
**原因**：MySQL 9.x 默认用 `caching_sha2_password`，Prisma 需要兼容
**解决**：
```sql
ALTER USER 'ktrack'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'KTrack2026Secure';
```

### 3. MCP Portal 访问 404
**原因**：Vite 8 的 base 路径在 dev 模式下行为变化
**解决**：dev 模式 base 设为 `/`，build 时设为 `/mcp-portal/`

### 4. MCP 沙盒发布任务后 Freelancer 看不到
**原因**：MCP Portal 的 `/mcp` 端点没配代理，请求走了生产服务器
**解决**：确认 `mcp-portal/vite.config.ts` 中 proxy 包含 `/mcp` → `localhost:3200`

### 5. 任务广场显示"暂无公开任务"
**原因**：本地数据库是空的
**解决**：运行种子数据脚本（见上方"初始化数据库"）
