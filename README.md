<div align="center">

# ⚡ TimeLinker MCP Server

**The API for the Physical World.**  
赋予 AI 智能体手和脚 — 发布真实世界任务、匹配人才、合规结算，只需一次 MCP 调用。

[![MCP Protocol](https://img.shields.io/badge/MCP-2025--03--26-blue?style=flat-square)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[官网](https://mcp.timelinker.cn) · [申请 API Key](https://mcp.timelinker.cn/apply) · [文档](https://mcp.timelinker.cn/docs) · [定价](https://mcp.timelinker.cn/pricing)

</div>

---

## 🎯 简介

TimeLinker MCP 是一个基于 **Model Context Protocol (MCP)** 构建的灵活用工平台。允许 AI 智能体（Claude、Cursor、Dify 等）通过标准化协议直接操作真实世界的任务：

- 🔧 **7 个 MCP Tools** — 发布任务、搜索任务、报名、录用/拒绝、验收、进度上报
- 📂 **5 个 MCP Resources** — 任务列表、任务详情、仪表盘、人才库、交易记录
- 💰 **内置计费系统** — API Key 认证、调用量计量、免费额度 + 余额扣费
- 🛡️ **合规结算** — 代扣个税、合规开票、资金清算
- 🎁 **新用户赠送 100 次免费调用额度**

## 🚀 快速开始

### 1. 申请 API Key

前往官网 → [申请接入](https://mcp.timelinker.cn/apply)，填写使用场景，提交后立即获取 API Key。

### 2. 配置 Claude Desktop / Cursor

下载本仓库的 `mcp-proxy.mjs`，然后在 MCP 客户端配置中添加：

```json
{
  "mcpServers": {
    "timelinker": {
      "url": "https://mcp.timelinker.cn/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer 你申请到的_API_Key"
      }
    }
  }
}
```

### 3. 开始使用

配置完成后，你的 AI 助手就能调用 TimeLinker 的所有能力了：

> **你**：帮我发布一个任务，找一个摄影师去春熙路拍摄实景照片，预算 200 元  
> **AI**：好的，我来通过灵工通平台发布这个任务...  
> *(AI 调用 `publish_task` 工具，任务自动发布到平台)*

### 4. Python SDK（可选）

```python
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async with streamablehttp_client(
    "https://mcp.timelinker.cn/mcp",
    headers={"Authorization": "Bearer 你的_API_Key"}
) as (read, write, _):
    async with ClientSession(read, write) as session:
        await session.initialize()
        result = await session.call_tool("publish_task", {
            "name": "春熙路商圈实地拍摄",
            "budget": 80,
            "location": "成都市锦江区",
            "enterpriseId": 1
        })
```

## 🔧 MCP Tools

| Tool | Description |
|---|---|
| `publish_task` | 发布用工任务到平台 |
| `search_tasks` | 搜索任务（支持关键词、状态筛选） |
| `apply_task` | 劳动者报名申请 |
| `accept_application` | 录用申请人 |
| `reject_application` | 拒绝申请人 |
| `approve_completion` | 企业验收完成 |
| `submit_progress` | 提交工作进度 |

## 📂 MCP Resources

| Resource URI | Description |
|---|---|
| `timelinker://tasks` | 所有公开任务列表 |
| `timelinker://tasks/{taskId}` | 任务详情（含申请、进度） |
| `timelinker://dashboard/{enterpriseId}` | 企业仪表盘统计 |
| `timelinker://talent` | 可用人才列表 |
| `timelinker://transactions/{enterpriseId}` | 交易订单列表 |

## 📦 文件说明

| 文件 | 说明 |
|---|---|
| `mcp-proxy.mjs` | stdio-to-HTTP 代理，用于 Claude Desktop / Cursor 接入 |
| `README.md` | 本文档 |

## 💰 定价

| 方案 | 价格 | 说明 |
|---|---|---|
| 免费体验 | ¥0 | 注册即送 100 次调用 |
| 按量付费 | 服务费 = 预算 × 8%（最低 ¥10/次） | 发布任务时结算 |

详情请访问 [定价页面](https://mcp.timelinker.cn/pricing)。

## 🔒 安全说明

- 所有 MCP 请求需携带 `Authorization: Bearer <API_KEY>` 头
- API Key 由平台审核后统一发放，**无法自行生成**
- 支持调用频率限制（每分钟 100 次）
- 支持余额管理和计费明细查看

## 📄 License

[MIT License](LICENSE)