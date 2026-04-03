import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* ── Typewriter effect for the interactive code block ── */
function useTypewriter(text: string, speed: number, startDelay: number) {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    useEffect(() => {
        let i = 0;
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                i++;
                setDisplayed(text.slice(0, i));
                if (i >= text.length) { clearInterval(interval); setDone(true); }
            }, speed);
            return () => clearInterval(interval);
        }, startDelay);
        return () => clearTimeout(timer);
    }, [text, speed, startDelay]);
    return { displayed, done };
}

/* ── Request JSON (left pane) ── */
const REQUEST_CODE = `{
  "method": "tools/call",
  "params": {
    "name": "publish_task",
    "arguments": {
      "title": "春熙路商圈实地拍摄",
      "description": "前往春熙路 IFS，拍摄正门照片",
      "budget": 80,
      "location": "成都市锦江区春熙路"
    }
  }
}`;

/* ── Response JSON (right pane, typed out) ── */
const RESPONSE_CODE = `{
  "result": {
    "task_id": "TSK-20260322-0847",
    "status": "published",
    "matched_workers": 3,
    "eta": "45 min",
    "evidence_spec": {
      "photo": true,
      "gps_verified": true,
      "device_watermark": true
    }
  }
}`;

export default function Landing() {
    const { displayed: responseText, done: responseDone } = useTypewriter(RESPONSE_CODE, 18, 1200);
    const [cursorVisible, setCursorVisible] = useState(true);

    useEffect(() => {
        const blink = setInterval(() => setCursorVisible(v => !v), 530);
        return () => clearInterval(blink);
    }, []);

    return (
        <>
            {/* ══════════ HERO ══════════ */}
            <section className="hero-timelinker">
                <div className="hero-glow" />
                <div className="hero-grid-bg" />
                <div className="hero-content">
                    <div className="hero-text">
                        <h1>
                            The API for the<br />
                            <span className="gradient-text">Physical World.</span>
                        </h1>
                        <p className="hero-sub">
                            Give your AI Agents hands and feet. Execute real-world tasks,
                            collect physical data, and settle payments compliantly—all with
                            a single MCP call.
                        </p>
                        <p className="hero-sub-cn">
                            赋予你的 AI 智能体手和脚。执行真实世界的任务、采集物理数据并合规结算资金——只需一次简单的 MCP 调用。
                        </p>
                        <div className="hero-ctas">
                            <Link to="/docs">
                                <button className="btn-primary-lg">
                                    <span>📖</span> 阅读文档
                                </button>
                            </Link>
                            <Link to="/apply">
                                <button className="btn-secondary-lg">
                                    <span>⚡</span> 免费试用沙盒 <span className="badge-free">Free</span>
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* ── Interactive Code Block ── */}
                    <div className="hero-code-block">
                        <div className="code-panes">
                            <div className="code-pane code-pane-left">
                                <div className="code-pane-header">
                                    <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
                                    <span className="code-filename">request.json</span>
                                </div>
                                <pre><code>{REQUEST_CODE}</code></pre>
                            </div>
                            <div className="code-arrow">→</div>
                            <div className="code-pane code-pane-right">
                                <div className="code-pane-header">
                                    <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
                                    <span className="code-filename">response.json</span>
                                    {responseDone && <span className="status-badge">✓ 200 OK</span>}
                                </div>
                                <pre><code>{responseText}{!responseDone && cursorVisible ? '▊' : ''}</code></pre>
                            </div>
                        </div>
                        <p className="code-caption">代码 → 现实。一次调用，真实世界执行。</p>
                    </div>
                </div>
            </section>

            {/* ══════════ WHY SYNAPSE ══════════ */}
            <section className="why-timelinker">
                <h2 className="section-title">Why <span className="gradient-text">TimeLinker</span></h2>
                <p className="section-subtitle">不是又一个跑腿平台。是让 AI 智能体在物理世界中行动的基础设施。</p>
                <div className="why-grid">
                    <div className="why-card">
                        <div className="why-icon">⚡️</div>
                        <h3>Agent-Native</h3>
                        <p className="why-label">原生适配智能体</p>
                        <p>
                            Built on the Model Context Protocol (MCP). Plug directly into
                            Claude, Dify, and custom LLM workflows with zero friction.
                        </p>
                        <p className="why-cn">
                            基于 MCP 协议构建。零摩擦无缝接入 Claude、Dify 及自定义大模型工作流。
                        </p>
                    </div>
                    <div className="why-card">
                        <div className="why-icon">🛡️</div>
                        <h3>Anti-Fraud Evidence</h3>
                        <p className="why-label">防作弊的物理证据</p>
                        <p>
                            Cryptographically verified real-world data. We force-use native
                            cameras, embedding GPS, timestamps, and device IDs into every
                            deliverable.
                        </p>
                        <p className="why-cn">
                            密码学级别的真实世界数据校验。强制使用原生相机，将 GPS、时间戳和设备 ID 压入每一次交付凭证。
                        </p>
                    </div>
                    <div className="why-card">
                        <div className="why-icon">💸</div>
                        <h3>Fully Compliant Settlement</h3>
                        <p className="why-label">100% 合规清算</p>
                        <p>
                            Don't risk your company's treasury. We handle the messy reality
                            of gig-worker payouts, tax withholding, and invoicing under the hood.
                        </p>
                        <p className="why-cn">
                            别拿你公司的资金链冒险。我们在底层替你处理极其麻烦的零工发薪、个税代扣与合规开票。
                        </p>
                    </div>
                </div>
            </section>

            {/* ══════════ QUICK CODE EXAMPLE ══════════ */}
            <section className="section code-example-section">
                <h2 className="section-title">几行代码，<span className="gradient-text">真实可用</span></h2>
                <p className="section-subtitle">基于标准 MCP 协议，直接接入 Claude、Dify、Cursor 等任意 AI 客户端。</p>
                <div className="code-example-block">
                    <div className="code-pane-header">
                        <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
                        <span className="code-filename">agent.py</span>
                    </div>
                    <pre><code>{`from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async with streamablehttp_client(
    "https://mcp.timelinker.cn/mcp",
    headers={"Authorization": "Bearer kt_live_YOUR_API_KEY"}
) as (read, write, _):
    async with ClientSession(read, write) as session:
        await session.initialize()
        result = await session.call_tool("publish_task", {
            "name": "拍摄春熙路实景",
            "budget": 80,
            "location": "成都市锦江区",
            "enterpriseId": 1
        })
        print(result)  # → Task published, 3 workers matched`}</code></pre>
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}>
                    <Link to="/apply">
                        <button className="btn-primary-lg"><span>🔑</span> 获取 API Key</button>
                    </Link>
                    <Link to="/docs">
                        <button className="btn-secondary-lg"><span>📖</span> 查看完整文档</button>
                    </Link>
                    <Link to="/apply">
                        <button className="btn-secondary-lg"><span>⚡</span> 在线试用沙盒</button>
                    </Link>
                </div>
            </section>

            {/* ══════════ ONBOARDING STEPS ══════════ */}
            <section className="section">
                <h2 className="section-title">4 步上线</h2>
                <p className="section-subtitle">无需审核，从注册到部署，几分钟内搞定。</p>
                <div className="steps-row">
                    {[
                        { num: '1', title: '填写信息', desc: '填写应用名称和联系方式，只需 1 分钟。', link: '/apply' },
                        { num: '2', title: '即刻获取密钥', desc: '无需审核，提交后立即生成 API Key。', link: '/apply' },
                        { num: '3', title: '沙盒测试', desc: '进入试用沙盒，在线体验全部 MCP 能力。', link: '/apply' },
                        { num: '4', title: '接入你的 Agent', desc: '复制配置到 Cursor / Claude Desktop，一键接入。', link: '/docs' },
                    ].map(s => (
                        <Link to={s.link} key={s.num} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="step-item" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                                <div className="step-num">{s.num}</div>
                                <h4>{s.title}</h4>
                                <p>{s.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: 48 }}>
                    <Link to="/apply">
                        <button className="btn-primary-lg">立即开始 →</button>
                    </Link>
                </div>
            </section>
        </>
    );
}
