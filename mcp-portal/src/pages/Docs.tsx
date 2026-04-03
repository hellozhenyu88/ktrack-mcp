import { useState } from 'react';
import { Link } from 'react-router-dom';

/* ── 复制工具 ── */
function copyText(text: string) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
}

/* ── 带终端标题和复制按钮的代码块组件 ── */
function CodeBlock({ filename, lang, html, raw }: { filename: string; lang?: string; html: string; raw: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        copyText(raw);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{
            borderRadius: 12, overflow: 'hidden', marginBottom: 24,
            border: '1px solid rgba(99,102,241,0.2)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #1e1b4b, #1e293b)',
                borderBottom: '1px solid rgba(99,102,241,0.15)',
            }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{
                    marginLeft: 8, fontSize: 12, color: '#94a3b8',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    letterSpacing: 0.5,
                }}>{filename}</span>
                {lang && (
                    <span style={{
                        marginLeft: 'auto', fontSize: 10, color: '#6366f1',
                        background: 'rgba(99,102,241,0.15)',
                        padding: '2px 8px', borderRadius: 4,
                        fontWeight: 600, textTransform: 'uppercase',
                    }}>{lang}</span>
                )}
                <button onClick={handleCopy} style={{
                    marginLeft: lang ? 8 : 'auto',
                    background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.15)',
                    border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(99,102,241,0.3)'}`,
                    color: copied ? '#4ade80' : '#a5b4fc',
                    borderRadius: 6, padding: '4px 12px',
                    fontSize: 11, cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: 'all 0.2s',
                }}>
                    {copied ? '✓ copied' : '⎘ copy'}
                </button>
            </div>
            <pre style={{
                margin: 0, padding: '20px 24px',
                background: '#0a0e1a',
                overflowX: 'auto', fontSize: 13, lineHeight: 1.8, tabSize: 2,
            }}>
                <code
                    style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </pre>
        </div>
    );
}

/* ── 章节标题 ── */
function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <h2 id={id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 48, marginBottom: 16, paddingBottom: 12,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
            {children}
        </h2>
    );
}

/* ──────── 颜色标记 ──────── */
const kw = (s: string) => `<span style="color:#c084fc;font-weight:600">${s}</span>`;
const str = (s: string) => `<span style="color:#6ee7b7">${s}</span>`;
const num = (s: string) => `<span style="color:#fbbf24">${s}</span>`;
const prop = (s: string) => `<span style="color:#c4b5fd">${s}</span>`;
const cmt = (s: string) => `<span style="color:#64748b;font-style:italic">${s}</span>`;
const fn = (s: string) => `<span style="color:#93c5fd">${s}</span>`;
const br = (s: string) => `<span style="color:#94a3b8">${s}</span>`;

/* ──────── 代码原文 (用于 Copy 按钮) ──────── */
const JSON_RAW = `{
  "mcpServers": {
    "timelinker": {
      "url": "https://mcp.timelinker.cn/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer kt_live_你的API_KEY"
      }
    }
  }
}`;

const PY_RAW = `from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async with streamablehttp_client(
    "https://mcp.timelinker.cn/mcp",
    headers={"Authorization": "Bearer kt_live_xxx"}
) as (read, write, _):
    async with ClientSession(read, write) as session:
        await session.initialize()

        # 列出可用工具
        tools = await session.list_tools()

        # 发布任务
        result = await session.call_tool("publish_task", {
            "name": "前端开发工程师",
            "type": "软件开发",
            "description": "负责 H5 页面开发",
            "budget": 15000,
            "peopleNeeded": 1,
            "duration": "2周",
            "location": "远程",
            "enterpriseId": 1
        })`;

const TS_RAW = `import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport }
    from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(
    new URL("https://mcp.timelinker.cn/mcp"),
    { requestInit: { headers: { "Authorization": "Bearer kt_live_xxx" } } }
);
const client = new Client({ name: "my-ai-app", version: "1.0" });
await client.connect(transport);

// 搜索任务
const result = await client.callTool({
    name: "search_tasks",
    arguments: { status: "open", pageSize: 10 }
});`;

/* ──────── 手写高亮 HTML ──────── */
const JSON_HL = [
    br('{'),
    `  ${prop('"mcpServers"')}: ${br('{')}`,
    `    ${prop('"timelinker"')}: ${br('{')}`,
    `      ${prop('"url"')}: ${str('"https://mcp.timelinker.cn/mcp"')},`,
    `      ${prop('"transport"')}: ${str('"streamable-http"')},`,
    `      ${prop('"headers"')}: ${br('{')}`,
    `        ${prop('"Authorization"')}: ${str('"Bearer kt_live_你的API_KEY"')}`,
    `      ${br('}')}`,
    `    ${br('}')}`,
    `  ${br('}')}`,
    br('}'),
].join('\n');

const PY_HL = [
    `${kw('from')} mcp ${kw('import')} ClientSession`,
    `${kw('from')} mcp.client.streamable_http ${kw('import')} streamablehttp_client`,
    ``,
    `${kw('async')} ${kw('with')} ${fn('streamablehttp_client')}(`,
    `    ${str('"https://mcp.timelinker.cn/mcp"')},`,
    `    headers=${br('{')  }${str('"Authorization"')}: ${str('"Bearer kt_live_xxx"')}${br('}')}`,
    `) ${kw('as')} (read, write, _):`,
    `    ${kw('async')} ${kw('with')} ${fn('ClientSession')}(read, write) ${kw('as')} session:`,
    `        ${kw('await')} session.${fn('initialize')}()`,
    ``,
    `        ${cmt('# 列出可用工具')}`,
    `        tools = ${kw('await')} session.${fn('list_tools')}()`,
    ``,
    `        ${cmt('# 发布任务')}`,
    `        result = ${kw('await')} session.${fn('call_tool')}(${str('"publish_task"')}, ${br('{')}`,
    `            ${str('"name"')}: ${str('"前端开发工程师"')},`,
    `            ${str('"type"')}: ${str('"软件开发"')},`,
    `            ${str('"description"')}: ${str('"负责 H5 页面开发"')},`,
    `            ${str('"budget"')}: ${num('15000')},`,
    `            ${str('"peopleNeeded"')}: ${num('1')},`,
    `            ${str('"duration"')}: ${str('"2周"')},`,
    `            ${str('"location"')}: ${str('"远程"')},`,
    `            ${str('"enterpriseId"')}: ${num('1')}`,
    `        ${br('}')})`,
].join('\n');

const TS_HL = [
    `${kw('import')} ${br('{')} Client ${br('}')} ${kw('from')} ${str("'@modelcontextprotocol/sdk/client/index.js'")};`,
    `${kw('import')} ${br('{')} StreamableHTTPClientTransport ${br('}')}`,
    `    ${kw('from')} ${str("'@modelcontextprotocol/sdk/client/streamableHttp.js'")};`,
    ``,
    `${kw('const')} transport = ${kw('new')} ${fn('StreamableHTTPClientTransport')}(`,
    `    ${kw('new')} ${fn('URL')}(${str('"https://mcp.timelinker.cn/mcp"')}),`,
    `    ${br('{')} requestInit: ${br('{')} headers: ${br('{')} ${str('"Authorization"')}: ${str('"Bearer kt_live_xxx"')} ${br('}')} ${br('}')} ${br('}')}`,
    `);`,
    `${kw('const')} client = ${kw('new')} ${fn('Client')}(${br('{')} name: ${str('"my-ai-app"')}, version: ${str('"1.0"')} ${br('}')});`,
    `${kw('await')} client.${fn('connect')}(transport);`,
    ``,
    `${cmt('// 搜索任务')}`,
    `${kw('const')} result = ${kw('await')} client.${fn('callTool')}(${br('{')}`,
    `    name: ${str('"search_tasks"')},`,
    `    arguments: ${br('{')} status: ${str('"open"')}, pageSize: ${num('10')} ${br('}')}`,
    `${br('}')});`,
].join('\n');

const AUTH_HL = `${prop('Authorization')}: ${str('Bearer kt_live_你的API_KEY')}`;

export default function Docs() {
    return (
        <div className="docs-container">
            <h1>MCP 接入文档</h1>
            <p style={{ color: '#94a3b8', marginBottom: 40 }}>5 分钟完成 TimeLinker MCP 集成</p>

            {/* 快速导航 */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 40,
                padding: '16px 20px', borderRadius: 12,
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
            }}>
                <span style={{ color: '#64748b', fontSize: 13, marginRight: 8 }}>📑 目录</span>
                {[
                    ['#quick-start', '快速开始'],
                    ['#auth', '认证方式'],
                    ['#tools', 'MCP Tools'],
                    ['#resources', 'MCP Resources'],
                    ['#errors', '错误码'],
                ].map(([href, label]) => (
                    <a key={href} href={href} style={{
                        color: '#a5b4fc', fontSize: 13, textDecoration: 'none',
                        padding: '4px 12px', borderRadius: 6,
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        transition: 'all 0.2s',
                    }}>{label}</a>
                ))}
            </div>

            <SectionTitle id="quick-start">🚀 快速开始</SectionTitle>

            <h3>1. 获取 API Key</h3>
            <p>在 <Link to="/apply" style={{ color: '#818cf8' }}>申请页面</Link> 提交申请，即刻获取 <code style={{ color: '#4ade80', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: 4 }}>kt_live_xxx</code> 格式的 API Key。</p>

            <h3>2. 配置 MCP 客户端</h3>
            <p><strong>Claude Desktop / Cursor 配置：</strong></p>
            <CodeBlock filename="mcp_config.json" lang="json" html={JSON_HL} raw={JSON_RAW} />

            <h3>3. Python SDK 示例</h3>
            <CodeBlock filename="agent.py" lang="python" html={PY_HL} raw={PY_RAW} />

            <h3>4. TypeScript SDK 示例</h3>
            <CodeBlock filename="agent.ts" lang="typescript" html={TS_HL} raw={TS_RAW} />

            <SectionTitle id="auth">🔐 认证方式</SectionTitle>
            <p>所有 MCP 请求需在 HTTP Header 中携带：</p>
            <CodeBlock filename="HTTP Header" lang="http" html={AUTH_HL} raw="Authorization: Bearer kt_live_你的API_KEY" />
            <p>API Key 通过注册申请获得，一个应用可拥有多个 Key。</p>

            <SectionTitle id="tools">🔧 MCP Tools 列表</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
                {[
                    { name: 'publish_task', desc: '发布用工任务', params: 'name, type, description, requirements, peopleNeeded, budget, duration, location, enterpriseId' },
                    { name: 'search_tasks', desc: '搜索任务', params: 'search, status, page, pageSize' },
                    { name: 'accept_application', desc: '录用申请人', params: 'taskId, applicationId' },
                    { name: 'reject_application', desc: '拒绝申请人', params: 'applicationId' },
                    { name: 'approve_completion', desc: '验收完成，触发结算', params: 'taskId' },
                    { name: 'apply_task', desc: '劳动者报名任务', params: 'taskId, freelancerId, coverLetter, quotedPrice' },
                    { name: 'submit_progress', desc: '提交进度报告', params: 'taskId, freelancerId, content, mediaUrls' },
                ].map(t => (
                    <div key={t.name} style={{
                        padding: '14px 16px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <code style={{ color: '#a5b4fc', fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{t.name}</code>
                        <div style={{ color: '#e2e8f0', fontSize: 13, marginTop: 6 }}>{t.desc}</div>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 6, fontFamily: 'monospace' }}>参数: {t.params}</div>
                    </div>
                ))}
            </div>

            <SectionTitle id="resources">📂 MCP Resources 列表</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
                {[
                    { uri: 'timelinker://tasks', desc: '公开任务列表' },
                    { uri: 'timelinker://tasks/{taskId}', desc: '任务详情（模板资源）' },
                    { uri: 'timelinker://dashboard/{enterpriseId}', desc: '企业仪表盘' },
                    { uri: 'timelinker://talent', desc: '可用人才列表' },
                    { uri: 'timelinker://transactions/{enterpriseId}', desc: '交易订单列表' },
                ].map(r => (
                    <div key={r.uri} style={{
                        padding: '14px 16px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <code style={{ color: '#6ee7b7', fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{r.uri}</code>
                        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>{r.desc}</div>
                    </div>
                ))}
            </div>

            <SectionTitle id="errors">⚠️ 错误码</SectionTitle>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a5b4fc', fontSize: 13, fontWeight: 600 }}>状态码</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a5b4fc', fontSize: 13, fontWeight: 600 }}>说明</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ['401', 'API Key 无效或已过期'],
                            ['403', '应用已被暂停'],
                            ['404', '会话不存在（需重新初始化）'],
                            ['429', '超出速率限制（默认 100 次/分钟）'],
                            ['500', '服务器内部错误'],
                        ].map(([code, desc]) => (
                            <tr key={code} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '10px 16px' }}>
                                    <code style={{
                                        color: Number(code) >= 500 ? '#ef4444' : Number(code) >= 400 ? '#f59e0b' : '#4ade80',
                                        fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700,
                                    }}>{code}</code>
                                </td>
                                <td style={{ padding: '10px 16px', color: '#cbd5e1', fontSize: 13 }}>{desc}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <SectionTitle id="rate-limit">⏱️ 速率限制</SectionTitle>
            <p>默认每分钟 100 次请求。如需提高限额，请联系我们升级到企业版。超出限制后返回 HTTP 429，请等待 1 分钟后重试。</p>
        </div>
    );
}
