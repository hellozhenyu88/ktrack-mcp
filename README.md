<div align="center">

# ⚡ TimeLinker MCP Server

**The API for the Physical World**  
赋予 AI 智能体手和脚 — 发布真实世界任务、匹配人才、合规结算，只需一次 MCP 调用。

[![MCP Protocol](https://img.shields.io/badge/MCP-2025--03--26-blue?style=flat-square)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Website](https://img.shields.io/badge/官网-mcp.timelinker.cn-purple?style=flat-square)](https://mcp.timelinker.cn)

[官网](https://mcp.timelinker.cn) · [申请 API Key](https://mcp.timelinker.cn/apply) · [在线文档](https://mcp.timelinker.cn/docs) · [定价](https://mcp.timelinker.cn/pricing) · [控制台](https://mcp.timelinker.cn/console)

</div>

---

## 🎯 什么是 TimeLinker MCP？

TimeLinker MCP 是一个基于 **[Model Context Protocol (MCP)](https://modelcontextprotocol.io)** 构建的灵活用工服务平台。

它让 AI 智能体（Claude、Cursor、Dify、自研 Agent 等）能够通过标准化协议**直接操作真实世界的任务**——发布需求、匹配人才、管理进度、合规结算——就像调用一个 API 一样简单。

### 核心能力

| 能力 | 说明 |
|------|------|
| 🔧 **7 个 MCP Tools** | 发布任务、搜索任务、报名、录用/拒绝、验收、进度上报 |
| 📂 **5 个 MCP Resources** | 任务列表、任务详情、仪表盘、人才库、交易记录 |
| 💰 **内置计费系统** | API Key 认证、调用量计量、免费额度 + 余额扣费 |
| 🛡️ **合规结算** | 代扣个税、合规开票、资金清算 |
| 🎁 **免费体验** | 新用户赠送 100 次免费调用额度 |

### 工作流示意

```
你的 AI 助手 (Claude / Cursor / 自研 Agent)
        │
        │  MCP Protocol (streamable-http)
        ▼
┌─────────────────────────────┐
│   TimeLinker MCP Server     │
│   https://mcp.timelinker.cn │
├─────────────────────────────┤
│  Tools:  publish_task       │──→ 发布真实任务到平台
│          search_tasks       │──→ 搜索匹配的任务
│          apply_task         │──→ 劳动者报名
│          accept_application │──→ 企业录用
│          approve_completion │──→ 验收结算
│  Resources:                 │
│          timelinker://tasks │──→ 实时任务数据
│          timelinker://talent│──→ 人才库
└─────────────────────────────┘
        │
        ▼
    真实世界执行（拍摄、配送、开发...）
```

---

## 🚀 快速开始（5 分钟接入）

### 第一步：申请 API Key

前往 👉 **[申请接入](https://mcp.timelinker.cn/apply)** ，填写使用场景，提交后**立即获取** `kt_live_xxx` 格式的 API Key。

### 第二步：配置你的 AI 客户端

选择你使用的客户端，按对应方式配置：

---

#### 方式一：Claude Desktop

编辑 Claude Desktop 配置文件：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "timelinker": {
      "url": "https://mcp.timelinker.cn/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer kt_live_你的API_KEY"
      }
    }
  }
}
```

保存后**重启 Claude Desktop**，在对话中你会看到 TimeLinker 的工具图标 🔧。

---

#### 方式二：Cursor

打开 **Settings → MCP Servers → Add new MCP server**，添加：

```json
{
  "mcpServers": {
    "timelinker": {
      "url": "https://mcp.timelinker.cn/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer kt_live_你的API_KEY"
      }
    }
  }
}
```

保存后 Cursor 会自动连接，你可以在 Agent 模式下使用 TimeLinker 的所有能力。

---

#### 方式三：Python SDK

安装 MCP Python SDK：

```bash
pip install mcp
```

完整示例代码：

```python
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def main():
    # 连接 TimeLinker MCP Server
    async with streamablehttp_client(
        "https://mcp.timelinker.cn/mcp",
        headers={"Authorization": "Bearer kt_live_你的API_KEY"}
    ) as (read, write, _):
        async with ClientSession(read, write) as session:
            # 初始化连接
            await session.initialize()

            # 查看可用工具
            tools = await session.list_tools()
            print(f"可用工具: {[t.name for t in tools.tools]}")

            # 查看可用资源
            resources = await session.list_resources()
            print(f"可用资源: {[r.uri for r in resources.resources]}")

            # 搜索公开任务
            result = await session.call_tool("search_tasks", {
                "status": "open",
                "pageSize": 5
            })
            print(f"搜索结果: {result.content[0].text}")

            # 发布一个新任务
            result = await session.call_tool("publish_task", {
                "name": "春熙路商圈实地拍摄",
                "type": "摄影服务",
                "description": "需要一位摄影师前往春熙路商圈拍摄 20 张实景照片，用于商业宣传",
                "requirements": "有商业摄影经验，自备相机",
                "budget": 200,
                "peopleNeeded": 1,
                "duration": "1天",
                "location": "成都市锦江区春熙路",
                "enterpriseId": 1
            })
            print(f"任务发布成功: {result.content[0].text}")

            # 读取资源：获取任务列表
            resource = await session.read_resource("timelinker://tasks")
            print(f"当前任务: {resource.contents[0].text}")

asyncio.run(main())
```

---

#### 方式四：TypeScript / Node.js SDK

安装 MCP TypeScript SDK：

```bash
npm install @modelcontextprotocol/sdk
```

完整示例代码：

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport }
    from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// 创建连接
const transport = new StreamableHTTPClientTransport(
    new URL("https://mcp.timelinker.cn/mcp"),
    {
        requestInit: {
            headers: {
                "Authorization": "Bearer kt_live_你的API_KEY"
            }
        }
    }
);

const client = new Client({ name: "my-ai-app", version: "1.0" });
await client.connect(transport);

// 列出所有可用工具
const tools = await client.listTools();
console.log("可用工具:", tools.tools.map(t => t.name));

// 列出所有可用资源
const resources = await client.listResources();
console.log("可用资源:", resources.resources.map(r => r.uri));

// 搜索任务
const searchResult = await client.callTool({
    name: "search_tasks",
    arguments: { status: "open", pageSize: 10 }
});
console.log("搜索结果:", searchResult.content);

// 发布任务
const publishResult = await client.callTool({
    name: "publish_task",
    arguments: {
        name: "H5 页面开发",
        type: "软件开发",
        description: "需要开发一个活动 H5 页面，含动画效果",
        budget: 15000,
        peopleNeeded: 1,
        duration: "2周",
        location: "远程",
        enterpriseId: 1
    }
});
console.log("发布结果:", publishResult.content);

// 读取资源
const taskList = await client.readResource({ uri: "timelinker://tasks" });
console.log("任务列表:", taskList.contents);

await client.close();
```

---

### 第三步：开始使用

配置完成后，你的 AI 助手就能调用 TimeLinker 的所有能力了。

**对话示例：**

> **你**：帮我发布一个任务，找一个摄影师去春熙路拍摄实景照片，预算 200 元  
> **AI**：好的，我来通过 TimeLinker 平台发布这个任务...  
> *(AI 自动调用 `publish_task` 工具，任务发布到平台，等待劳动者报名)*

> **你**：查看目前有哪些公开的任务  
> **AI**：我来搜索一下当前的公开任务...  
> *(AI 调用 `search_tasks` 工具，返回任务列表)*

> **你**：有人报名了吗？录用第一个申请人  
> **AI**：有 3 人报名了这个任务，我来录用评分最高的申请人...  
> *(AI 调用 `accept_application` 工具，系统自动通知劳动者)*

---

## 🔧 MCP Tools 完整参考

### `publish_task` — 发布用工任务

发布一个新任务到平台，等待劳动者报名。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 任务名称 |
| `type` | string | ✅ | 任务类型（如：摄影服务、软件开发、配送） |
| `description` | string | ✅ | 任务详细描述 |
| `requirements` | string | ❌ | 技能要求 |
| `budget` | number | ✅ | 预算金额（元） |
| `peopleNeeded` | number | ✅ | 需要人数 |
| `duration` | string | ✅ | 预计工期（如：1天、2周） |
| `location` | string | ✅ | 工作地点（如：成都市锦江区、远程） |
| `enterpriseId` | number | ✅ | 企业 ID |

**调用示例：**
```json
{
  "name": "publish_task",
  "arguments": {
    "name": "春熙路商圈实地拍摄",
    "type": "摄影服务",
    "description": "拍摄 20 张商业实景照片",
    "requirements": "有商业摄影经验",
    "budget": 200,
    "peopleNeeded": 1,
    "duration": "1天",
    "location": "成都市锦江区春熙路",
    "enterpriseId": 1
  }
}
```

---

### `search_tasks` — 搜索任务

按条件搜索平台上的任务。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `search` | string | ❌ | 关键词搜索 |
| `status` | string | ❌ | 任务状态：`open` / `in_progress` / `completed` |
| `page` | number | ❌ | 页码（默认 1） |
| `pageSize` | number | ❌ | 每页条数（默认 10） |

---

### `apply_task` — 劳动者报名任务

劳动者申请报名某个任务。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `taskId` | number | ✅ | 任务 ID |
| `freelancerId` | number | ✅ | 劳动者 ID |
| `coverLetter` | string | ❌ | 自我介绍 / 申请说明 |
| `quotedPrice` | number | ❌ | 报价金额 |

---

### `accept_application` — 录用申请人

企业录用某个报名的申请人。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `taskId` | number | ✅ | 任务 ID |
| `applicationId` | number | ✅ | 申请记录 ID |

---

### `reject_application` — 拒绝申请人

企业拒绝某个报名的申请人。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `applicationId` | number | ✅ | 申请记录 ID |

---

### `approve_completion` — 验收完成

企业确认任务完成，触发结算流程。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `taskId` | number | ✅ | 任务 ID |

---

### `submit_progress` — 提交进度报告

劳动者在执行过程中提交工作进度。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `taskId` | number | ✅ | 任务 ID |
| `freelancerId` | number | ✅ | 劳动者 ID |
| `content` | string | ✅ | 进度描述 |
| `mediaUrls` | string[] | ❌ | 附件图片/视频链接 |

---

## 📂 MCP Resources 完整参考

MCP Resources 让 AI 智能体可以**直接读取平台数据**，无需调用工具。

| Resource URI | 说明 | 返回格式 |
|---|---|---|
| `timelinker://tasks` | 所有公开任务列表 | JSON 数组 |
| `timelinker://tasks/{taskId}` | 指定任务详情（含申请人、进度历史） | JSON 对象 |
| `timelinker://dashboard/{enterpriseId}` | 企业仪表盘（任务统计、支出概览） | JSON 对象 |
| `timelinker://talent` | 可用人才列表（含技能、评分） | JSON 数组 |
| `timelinker://transactions/{enterpriseId}` | 企业交易订单列表 | JSON 数组 |

**读取示例（Python）：**
```python
# 获取所有公开任务
tasks = await session.read_resource("timelinker://tasks")

# 获取某个任务的详情
detail = await session.read_resource("timelinker://tasks/42")

# 获取企业仪表盘
dashboard = await session.read_resource("timelinker://dashboard/1")

# 获取可用人才列表
talent = await session.read_resource("timelinker://talent")
```

---

## 🔐 认证方式

所有请求需要在 HTTP Header 中携带 API Key：

```
Authorization: Bearer kt_live_你的API_KEY
```

| 说明 | 详情 |
|------|------|
| Key 格式 | `kt_live_` 前缀 + 随机字符串 |
| 获取方式 | [申请页面](https://mcp.timelinker.cn/apply) 提交后即时获取 |
| 使用限制 | 每分钟 100 次请求（可升级） |
| 免费额度 | 注册即送 100 次调用 |

---

## 💰 定价

| 方案 | 价格 | 说明 |
|------|------|------|
| 🎁 免费体验 | ¥0 | 注册即送 100 次 MCP 调用 |
| 💳 按量付费 | 服务费 = 任务预算 × 8%（最低 ¥10/次） | 仅在发布任务时收取 |
| 🏢 企业版 | 联系我们 | 更高调用限额、专属技术支持 |

详细定价请访问 👉 [定价页面](https://mcp.timelinker.cn/pricing)

---

## ⚠️ 错误码

| HTTP 状态码 | 说明 | 处理建议 |
|-------------|------|----------|
| `401` | API Key 无效或已过期 | 检查 Key 是否正确，或重新申请 |
| `403` | 应用已被暂停 | 联系管理员恢复 |
| `404` | MCP 会话不存在 | 客户端需重新初始化连接 |
| `429` | 超出速率限制 | 等待 1 分钟后重试，或升级企业版 |
| `500` | 服务器内部错误 | 稍后重试，若持续请联系支持 |

---

## 📁 仓库文件说明

```
TimeLinker-MCP/
├── README.md              ← 本文档
├── mcp-proxy.mjs          ← stdio-to-HTTP 代理（用于 Claude Desktop）
├── server/                ← MCP Server 源码
│   ├── src/mcp/mcpServer.ts  ← MCP 协议实现（Tools + Resources）
│   └── src/middleware/mcpGateway.ts ← API Key 认证 + 计费网关
├── mcp-portal/            ← Web 控制台前端
│   └── src/pages/
│       ├── Landing.tsx    ← 官网首页
│       ├── Docs.tsx       ← 接入文档页
│       ├── Apply.tsx      ← API Key 申请页
│       └── console/       ← 用户控制台
└── timelinker.conf        ← Nginx 生产环境配置
```

---

## 🔗 相关链接

| 链接 | 说明 |
|------|------|
| [官网首页](https://mcp.timelinker.cn) | 产品介绍与快速入口 |
| [申请 API Key](https://mcp.timelinker.cn/apply) | 填写表单，即时获取 Key |
| [在线文档](https://mcp.timelinker.cn/docs) | 完整接入文档（含代码示例） |
| [控制台](https://mcp.timelinker.cn/console) | 查看用量、管理 Key、沙盒测试 |
| [定价页面](https://mcp.timelinker.cn/pricing) | 免费额度 + 按量付费 |
| [MCP 协议规范](https://modelcontextprotocol.io) | Model Context Protocol 官方文档 |

---

## 📄 License

[MIT License](LICENSE)

---

<div align="center">

**⚡ TimeLinker — The API for the Physical World**

让 AI 不止于对话，更能驱动真实世界。

[立即开始 →](https://mcp.timelinker.cn/apply)

</div>