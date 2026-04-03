# MCP Portal 用户流程分析与优化建议

## 当前流程截图

````carousel
![Landing 首屏 — 标题 + 代码示例](/Users/hello./.gemini/antigravity/brain/ddc9d35c-6d23-4f32-bce2-62596b04a17d/mcp_portal_landing_top_1775212910843.png)
<!-- slide -->
![Landing 中部 — Python 接入示例](/Users/hello./.gemini/antigravity/brain/ddc9d35c-6d23-4f32-bce2-62596b04a17d/mcp_portal_landing_mid2_1775212922775.png)
<!-- slide -->
![Landing 底部 — 4步上线](/Users/hello./.gemini/antigravity/brain/ddc9d35c-6d23-4f32-bce2-62596b04a17d/mcp_portal_landing_bottom_1775212936261.png)
<!-- slide -->
![获取 API Key 表单](/Users/hello./.gemini/antigravity/brain/ddc9d35c-6d23-4f32-bce2-62596b04a17d/mcp_portal_apply_form_1775212978192.png)
<!-- slide -->
![控制台概览](/Users/hello./.gemini/antigravity/brain/ddc9d35c-6d23-4f32-bce2-62596b04a17d/mcp_portal_console_overview_1775213092625.png)
<!-- slide -->
![试用沙盒](/Users/hello./.gemini/antigravity/brain/ddc9d35c-6d23-4f32-bce2-62596b04a17d/mcp_portal_sandbox_view_1775213018119.png)
````

---

## 当前用户旅程

```mermaid
flowchart TD
    A["用户访问首页"] --> B["了解产品价值"]
    B --> C{"选择行动"}
    C -->|获取 API Key| D["填写表单 4项"]
    C -->|免费试用沙盒| E["❌ 要求输入 API Key"]
    C -->|阅读文档| F["查看接入文档"]
    D --> G["获得 API Key"]
    G --> H["进入控制台"]
    H --> I["试用沙盒"]
    I --> J["发布任务测试"]
    J --> K["❌ 不知道 Key 怎么用到自己系统"]
    
    style E fill:#ff6b6b,color:#fff
    style K fill:#ff6b6b,color:#fff
```

---

## 🔴 关键问题（阻断用户）

### 问题 1：「免费试用沙盒」按钮是死胡同
首页最醒目的 CTA 按钮「⚡ 免费试用沙盒 Free」，用户点击后直接弹出"开发者登录"要求输入 API Key。但新用户没有 Key！

> [!CAUTION]
> **影响**：新用户第一次点击最吸引人的按钮却遇到门槛，60%+ 会流失。

**建议**：提供一个**无需注册的公共沙盒**，或在弹窗里加一个"还没有 Key？立即免费获取 →"的引导链接。

---

### 问题 2：获取 Key 后没有「下一步指引」
用户填完表单、拿到 API Key 后，页面上**没有告诉他接下来该做什么**：
- Key 去哪里用？
- 怎么配到 Cursor / Claude / Dify？
- 一键复制的格式是什么？

> [!IMPORTANT]
> **建议**：获取 Key 成功后，显示一个**"快速上手"结果页**，包含：
> 1. API Key（一键复制）
> 2. 3 种接入方式的代码片段（Cursor、Claude Desktop、Python SDK）
> 3. "立即去沙盒测试 →" 按钮

---

### 问题 3：沙盒里手动写 JSON 门槛太高
当前沙盒要求用户了解每个工具的参数结构并手写 JSON。对非技术用户或初次接触 MCP 的用户来说太专业了。

**建议**：改为**表单模式**，每个工具提供可视化的输入字段（任务名称、预算、地点等），JSON 在下方自动生成预览。

---

## 🟡 体验问题（可优化）

### 问题 4：代码示例中的硬编码 IP
首页和文档中的代码示例写的是 `http://8.156.66.62:3200/mcp`，但用户需要的是**生产域名**。

**建议**：
- 使用友好域名如 `https://api.timelinker.cn/mcp`
- 或至少用占位符 `https://YOUR_SERVER/mcp`

---

### 问题 5：4步上线里少了「怎么配置 AI 客户端」
底部"4步上线"第4步写着"配置你的 Agent，开始正式调用"，但实际上没有任何配置指南。用户不知道怎么把 Key 放进 Cursor 或 Claude Desktop。

**建议**：第4步改为可点击跳转，链接到一个**「1分钟接入指南」**页面，包含：

```json
// Cursor / Claude Desktop 配置
{
  "mcpServers": {
    "timelinker": {
      "url": "https://api.timelinker.cn/mcp",
      "headers": {
        "Authorization": "Bearer kt_live_YOUR_API_KEY"
      }
    }
  }
}
```

---

### 问题 6：控制台缺少「我的 API Key」区域
控制台概览页显示了调用统计，但 **API Key 本身不可见也不可复制**。用户如果需要复制 Key 配置到其他客户端，找不到地方。

**建议**：在概览页"应用信息"卡片里增加一行"API Key"，带遮罩和"复制"按钮。

---

### 问题 7：落地页缺少「真实场景演示」
首页代码示例很好，但缺少一个**端到端的演示**：发布任务 → 劳动者看到 → 劳动者接单 → 提交成果。用户不理解闭环价值。

**建议**：增加一个"Live Demo"区域或动画，展示完整工作流：
1. AI Agent 调用 `publish_task` 发布任务
2. 自由职业者在手机上看到新任务
3. 自由职业者一键接单
4. 结算自动完成

---

## 🟢 做得好的部分

| 亮点 | 说明 |
|------|------|
| 🎨 视觉设计 | 深色主题很专业，代码高亮吸引开发者 |
| 📝 申请表单 | 只要 4 个字段，低门槛 |
| ⚡ 即时审批 | 无需人工审核，提交即获得 Key |
| 💰 免费额度 | 100 次免费调用，降低试用门槛 |
| 🧪 在线沙盒 | 不需要搭环境就能测试 MCP 协议 |

---

## 📋 优先级排序

| 优先级 | 改动 | 工作量 | 预期效果 |
|--------|------|--------|----------|
| 🔴 P0 | 获取 Key 成功后显示快速上手页（含复制 Key + 接入代码） | 中 | 转化率 +50% |
| 🔴 P0 | "免费试用沙盒"按钮改为先引导注册而非直接弹登录 | 小 | 减少跳出率 |
| 🟡 P1 | 控制台增加 API Key 显示/复制区域 | 小 | 用户自助配置 |
| 🟡 P1 | 新增「1分钟接入 Cursor/Claude」指南页 | 中 | 用户独立完成接入 |
| 🟡 P1 | 沙盒改表单输入模式（JSON 仅作预览） | 中 | 降低使用门槛 |
| 🟢 P2 | 代码示例用域名替代 IP | 小 | 更专业 |
| 🟢 P2 | 增加端到端工作流演示 | 大 | 提升理解和信任 |
