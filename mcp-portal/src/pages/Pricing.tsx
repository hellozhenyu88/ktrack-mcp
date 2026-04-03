import { Link } from 'react-router-dom';
import { Button } from 'antd';

export default function Pricing() {
    return (
        <section className="section" style={{ paddingTop: 120 }}>
            <h2 className="section-title">透明定价，按需付费</h2>
            <p className="section-subtitle">注册即送 3 次免费调用额度</p>

            <div className="pricing-grid">
                {/* 免费版 */}
                <div className="pricing-card">
                    <h3 style={{ fontSize: 20, color: '#fff', fontWeight: 600 }}>体验版</h3>
                    <div className="price">免费</div>
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>适合评估和测试</p>
                    <ul>
                        <li>3 次免费调用</li>
                        <li>所有 7 个 MCP Tools</li>
                        <li>所有 5 个 Resources</li>
                        <li>基础用量监控</li>
                        <li>社区支持</li>
                    </ul>
                    <Link to="/apply">
                        <Button block size="large" style={{ borderRadius: 12 }}>免费开始</Button>
                    </Link>
                </div>

                {/* 按次 */}
                <div className="pricing-card featured">
                    <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50)', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff', padding: '4px 20px', borderRadius: '0 0 12px 12px', fontSize: 12, fontWeight: 600 }}>推荐</div>
                    <h3 style={{ fontSize: 20, color: '#fff', fontWeight: 600 }}>按次计费</h3>
                    <div className="price">¥0.10<span>/次</span></div>
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>适合中小规模调用</p>
                    <ul>
                        <li>不限调用次数</li>
                        <li>所有 MCP 能力</li>
                        <li>详细调用日志</li>
                        <li>业务数据报表</li>
                        <li>优先技术支持</li>
                        <li>自定义速率限制</li>
                    </ul>
                    <Link to="/apply">
                        <Button type="primary" block size="large" style={{ borderRadius: 12 }}>立即申请</Button>
                    </Link>
                </div>

                {/* 包月 */}
                <div className="pricing-card">
                    <h3 style={{ fontSize: 20, color: '#fff', fontWeight: 600 }}>企业版</h3>
                    <div className="price">¥999<span>/月</span></div>
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>适合大规模集成</p>
                    <ul>
                        <li>每月 50,000 次调用</li>
                        <li>超出部分 ¥0.05/次</li>
                        <li>所有 MCP 能力</li>
                        <li>专属技术对接</li>
                        <li>SLA 保障 99.9%</li>
                        <li>定制化需求支持</li>
                    </ul>
                    <Link to="/apply">
                        <Button block size="large" style={{ borderRadius: 12 }}>联系我们</Button>
                    </Link>
                </div>
            </div>

            {/* FAQ */}
            <div style={{ maxWidth: 700, margin: '80px auto 0' }}>
                <h2 className="section-title" style={{ fontSize: 24 }}>常见问题</h2>
                <div style={{ marginTop: 32 }}>
                    {[
                        { q: '什么是 MCP？', a: 'MCP（Model Context Protocol）是由 Anthropic 提出的开放协议，让 AI 应用可以安全地调用外部工具和数据。灵工通通过 MCP 暴露用工管理能力，你的 AI 应用可以直接发任务、找人才。' },
                        { q: '免费额度用完后怎么计费？', a: '免费 3 次用完后，按选择的方案计费。按次版每次调用 ¥0.10，从账户余额中扣除。企业版享有每月 50,000 次包含额度。' },
                        { q: 'API Key 安全吗？', a: 'API Key 在服务器端使用 SHA-256 哈希存储，传输过程使用 HTTPS 加密。建议设置环境变量存储 Key，不要硬编码在代码中。' },
                        { q: '是否支持 Claude Desktop / Cursor？', a: '支持！所有兼容 MCP 协议的 AI 客户端均可使用，包括 Claude Desktop、Cursor、以及自定义的 MCP 客户端集成。' },
                    ].map(item => (
                        <div key={item.q} className="glass-card" style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16 }}>{item.q}</h3>
                            <p>{item.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
