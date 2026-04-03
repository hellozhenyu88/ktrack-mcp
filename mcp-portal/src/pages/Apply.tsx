import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Form, Input, message } from 'antd';
import { SendOutlined, CopyOutlined, CheckOutlined, ThunderboltOutlined } from '@ant-design/icons';

export default function Apply() {
    const [apiKeyData, setApiKeyData] = useState<{
        apiKey: string;
        keyPrefix: string;
        freeQuota: number;
        name: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [form] = Form.useForm();

    const handleSubmit = async () => {
        const values = await form.validateFields();
        setLoading(true);
        try {
            const res = await fetch('/api/mcp/apps/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (data.code === 0) {
                setApiKeyData(data.data);
            } else {
                message.error(data.message || '提交失败');
            }
        } catch { message.error('网络错误，请稍后重试'); }
        finally { setLoading(false); }
    };

    const handleCopy = () => {
        if (apiKeyData?.apiKey) {
            // navigator.clipboard 在 HTTP 下不可用，使用 fallback
            try {
                const textarea = document.createElement('textarea');
                textarea.value = apiKeyData.apiKey;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                setCopied(true);
                message.success('API Key 已复制到剪贴板');
                setTimeout(() => setCopied(false), 2000);
            } catch {
                message.error('复制失败，请手动选择复制');
            }
        }
    };

    /* ── 注册成功：展示 API Key ── */
    if (apiKeyData) {
        return (
            <section className="section" style={{ paddingTop: 140 }}>
                <div style={{ maxWidth: 640, margin: '0 auto' }}>

                    {/* 标题区 */}
                    <div style={{ textAlign: 'center', marginBottom: 36 }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: 20,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px', fontSize: 32,
                        }}>🎉</div>
                        <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 10 }}>
                            注册成功！
                        </h2>
                        <p style={{ color: '#e2e8f0', fontSize: 15, margin: 0 }}>
                            你的应用{' '}
                            <strong style={{ color: '#c7d2fe' }}>{apiKeyData.name}</strong>
                            {' '}已创建，获赠{' '}
                            <strong style={{
                                display: 'inline-block',
                                background: '#4f46e5',
                                color: '#fff',
                                padding: '1px 10px',
                                borderRadius: 20,
                                fontSize: 14,
                            }}>
                                {apiKeyData.freeQuota} 次
                            </strong>
                            {' '}免费调用额度
                        </p>
                    </div>

                    {/* 警告提示 */}
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        background: 'rgba(234,179,8,0.12)',
                        border: '1px solid rgba(234,179,8,0.5)',
                        borderRadius: 12, padding: '14px 16px', marginBottom: 20,
                    }}>
                        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>⚠️</span>
                        <div>
                            <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                                请立即保存你的 API Key
                            </div>
                            <div style={{ color: '#fde68a', fontSize: 13, lineHeight: 1.6 }}>
                                API Key 只会显示一次，关闭页面后将无法再次查看。请务必复制并妥善保存。
                            </div>
                        </div>
                    </div>

                    {/* API Key 展示框 */}
                    <div style={{
                        borderRadius: 14, marginBottom: 20,
                        border: '1.5px solid #6366f1',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            background: '#1e1b4b',
                            padding: '8px 16px',
                            borderBottom: '1px solid rgba(99,102,241,0.3)',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: '#4ade80', display: 'inline-block',
                            }} />
                            <span style={{ color: '#a5b4fc', fontSize: 12, letterSpacing: 1, fontFamily: 'monospace' }}>
                                YOUR API KEY
                            </span>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: '#0f172a',
                            padding: '18px 16px',
                        }}>
                            <code style={{
                                flex: 1,
                                color: '#4ade80',
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                                wordBreak: 'break-all',
                                lineHeight: 1.7,
                                letterSpacing: 0.5,
                                userSelect: 'all',
                            }}>
                                {apiKeyData.apiKey}
                            </code>
                            <Button
                                type="text"
                                onClick={handleCopy}
                                style={{
                                    minWidth: 44, height: 44,
                                    border: '1px solid rgba(99,102,241,0.4)',
                                    borderRadius: 10,
                                    color: copied ? '#4ade80' : '#a5b4fc',
                                    flexShrink: 0,
                                }}
                                icon={copied
                                    ? <CheckOutlined style={{ fontSize: 16 }} />
                                    : <CopyOutlined style={{ fontSize: 16 }} />
                                }
                            />
                        </div>
                    </div>

                    {/* 快速配置示例 */}
                    <div style={{
                        borderRadius: 14, marginBottom: 32,
                        border: '1px solid rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            background: '#1e293b',
                            padding: '8px 16px',
                            borderBottom: '1px solid rgba(255,255,255,0.07)',
                        }}>
                            <span style={{ color: '#94a3b8', fontSize: 12, letterSpacing: 1, fontFamily: 'monospace' }}>
                                CLAUDE DESKTOP / CURSOR 配置
                            </span>
                        </div>
                        <pre style={{
                            background: '#0f172a', margin: 0,
                            padding: '18px 16px', overflowX: 'auto',
                        }}>
                            <code style={{
                                color: '#a5b4fc', fontSize: 13,
                                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                                lineHeight: 1.8, display: 'block',
                            }}>{`{
  "mcpServers": {
    "timelinker": {
      "url": "https://mcp.timelinker.cn/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer ${apiKeyData.apiKey}"
      }
    }
  }
}`}</code>
                        </pre>
                    </div>

                    {/* 操作按钮 */}
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                        <Link to={`/console/sandbox?key=${encodeURIComponent(apiKeyData.apiKey)}`}>
                            <Button type="primary" size="large" icon={<ThunderboltOutlined />}
                                style={{ height: 48, borderRadius: 12, paddingInline: 32, fontSize: 15 }}>
                                进入试用沙盒
                            </Button>
                        </Link>
                        <Link to="/docs">
                            <Button size="large"
                                style={{
                                    height: 48, borderRadius: 12, paddingInline: 32,
                                    background: 'rgba(255,255,255,0.05)',
                                    borderColor: 'rgba(255,255,255,0.15)',
                                    color: '#e2e8f0', fontSize: 15,
                                }}>
                                阅读文档
                            </Button>
                        </Link>
                    </div>

                </div>
            </section>
        );
    }

    /* ── 申请表单 ── */
    return (
        <section className="section" style={{ paddingTop: 120 }}>
            <h2 className="section-title">获取 API Key</h2>
            <p className="section-subtitle">填写信息后即刻获取 API Key，附赠 100 次免费调用额度</p>

            <div style={{
                maxWidth: 600, margin: '0 auto',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, padding: '36px 32px',
            }}>
                <Form form={form} layout="vertical" size="large"
                    requiredMark={false}
                >
                    <Form.Item label={<span style={{ color: '#e2e8f0' }}>应用名称</span>} name="name"
                        rules={[{ required: true, message: '请输入应用名称' }]}>
                        <Input placeholder="如：智能招聘 AI 助手" />
                    </Form.Item>

                    <Form.Item label={<span style={{ color: '#e2e8f0' }}>应用描述</span>} name="description"
                        rules={[{ required: true, message: '请描述您的使用场景' }]}>
                        <Input.TextArea rows={3} placeholder="简要描述你的 AI 应用以及如何使用 TimeLinker MCP 的能力" />
                    </Form.Item>

                    <Form.Item label={<span style={{ color: '#e2e8f0' }}>联系人</span>} name="contactName"
                        rules={[{ required: true, message: '请输入联系人姓名' }]}>
                        <Input placeholder="技术负责人姓名" />
                    </Form.Item>

                    <Form.Item label={<span style={{ color: '#e2e8f0' }}>联系邮箱</span>} name="contactEmail"
                        rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
                        <Input placeholder="developer@company.com" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                        <Button type="primary" block icon={<SendOutlined />} loading={loading}
                            onClick={handleSubmit}
                            style={{ height: 50, fontSize: 16, borderRadius: 12 }}>
                            立即获取 API Key
                        </Button>
                    </Form.Item>

                    <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
                        注册即送 100 次免费调用，无需审核，即刻可用
                    </p>
                </Form>
            </div>
        </section>
    );
}
