import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Row, Col, Statistic, Typography, Tag, Spin, Table, Button, message } from 'antd';
import {
    BarChartOutlined, DollarOutlined, ThunderboltOutlined,
    ApiOutlined, ClockCircleOutlined, CopyOutlined, CheckOutlined,
    EyeOutlined, EyeInvisibleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

function copyText(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

export default function Dashboard() {
    const { apiKey, appInfo } = useOutletContext<{ apiKey: string; appInfo: any }>();
    const [usage, setUsage] = useState<any>(null);
    const [balance, setBalance] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [keyCopied, setKeyCopied] = useState(false);
    const [configCopied, setConfigCopied] = useState(false);
    const [keyVisible, setKeyVisible] = useState(false);

    useEffect(() => {
        const headers = { 'Authorization': `Bearer ${apiKey}` };
        Promise.all([
            fetch('/api/mcp/apps/me/usage', { headers }).then(r => r.json()),
            fetch('/api/mcp/apps/me/balance', { headers }).then(r => r.json()),
        ]).then(([u, b]) => {
            if (u.code === 0) setUsage(u.data);
            if (b.code === 0) setBalance(b.data);
        }).finally(() => setLoading(false));
    }, [apiKey]);

    const maskedKey = apiKey.slice(0, 12) + '••••••••••••••••';
    const configJson = `{
  "mcpServers": {
    "timelinker": {
      "url": "https://mcp.timelinker.cn/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer ${apiKey}"
      }
    }
  }
}`;

    const handleCopyKey = () => {
        copyText(apiKey);
        setKeyCopied(true);
        message.success('API Key 已复制');
        setTimeout(() => setKeyCopied(false), 2000);
    };

    const handleCopyConfig = () => {
        copyText(configJson);
        setConfigCopied(true);
        message.success('配置已复制，粘贴到你的 Cursor/Claude 设置中即可');
        setTimeout(() => setConfigCopied(false), 2000);
    };

    return (
        <Spin spinning={loading}>
            <Title level={4}>概览</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                欢迎回来，{appInfo?.name || '开发者'} · Key 前缀 <Tag>{apiKey.slice(0, 12)}...</Tag>
            </Text>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic title="总调用次数" value={usage?.totalCalls || 0} prefix={<BarChartOutlined />} valueStyle={{ color: '#6366f1' }} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic title="账户余额" value={balance?.balance || 0} prefix={<DollarOutlined />} precision={2} suffix="¥" valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic title="免费剩余" value={balance?.freeRemaining || 0} prefix={<ThunderboltOutlined />} suffix="次" />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic title="统计周期" value={usage?.period || '7天'} prefix={<ClockCircleOutlined />} />
                    </Card>
                </Col>
            </Row>

            {/* ── API Key + 快速接入 ── */}
            <Card title="🔑 你的 API Key" style={{ borderRadius: 12, marginBottom: 24 }} size="small"
                extra={
                    <Button type="text" size="small" icon={keyVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={() => setKeyVisible(!keyVisible)}>
                        {keyVisible ? '隐藏' : '显示'}
                    </Button>
                }
            >
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#f5f5f5', borderRadius: 8, padding: '12px 16px', marginBottom: 16,
                }}>
                    <code style={{
                        flex: 1, fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                        wordBreak: 'break-all', color: '#1a1a2e', letterSpacing: 0.5,
                    }}>
                        {keyVisible ? apiKey : maskedKey}
                    </code>
                    <Button size="small" type="primary"
                        icon={keyCopied ? <CheckOutlined /> : <CopyOutlined />}
                        onClick={handleCopyKey}
                        style={{ flexShrink: 0 }}>
                        {keyCopied ? '已复制' : '复制'}
                    </Button>
                </div>

                <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 13 }}>⚡ 快速接入 Cursor / Claude Desktop</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        复制以下配置到设置文件中即可使用
                    </Text>
                </div>
                <div style={{ position: 'relative' }}>
                    <pre style={{
                        background: '#0f172a', borderRadius: 8, padding: '16px',
                        margin: 0, overflowX: 'auto', fontSize: 12.5, lineHeight: 1.7,
                    }}>
                        <code style={{ color: '#a5b4fc', fontFamily: "'JetBrains Mono', monospace" }}>
                            {configJson}
                        </code>
                    </pre>
                    <Button size="small"
                        icon={configCopied ? <CheckOutlined /> : <CopyOutlined />}
                        onClick={handleCopyConfig}
                        style={{
                            position: 'absolute', top: 8, right: 8,
                            background: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.4)',
                            color: configCopied ? '#4ade80' : '#a5b4fc',
                        }}>
                        {configCopied ? '已复制' : '复制配置'}
                    </Button>
                </div>
            </Card>

            <Row gutter={16}>
                <Col span={12}>
                    <Card title="按工具调用统计" style={{ borderRadius: 12 }} size="small">
                        <Table
                            dataSource={usage?.byTool || []}
                            rowKey="tool"
                            pagination={false}
                            size="small"
                            columns={[
                                { title: '工具', dataIndex: 'tool', render: (t: string) => <Tag color="purple"><ApiOutlined /> {t}</Tag> },
                                { title: '调用次数', dataIndex: 'calls', sorter: (a: any, b: any) => a.calls - b.calls },
                                { title: '平均耗时(ms)', dataIndex: 'avgDuration' },
                            ]}
                        />
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="应用信息" style={{ borderRadius: 12 }} size="small">
                        <div style={{ padding: '8px 0' }}>
                            {[
                                ['应用名称', appInfo?.name],
                                ['状态', appInfo?.status === 'approved' ? '✅ 已通过' : appInfo?.status],
                                ['联系邮箱', appInfo?.contactEmail],
                                ['创建时间', appInfo?.createdAt ? new Date(appInfo.createdAt).toLocaleString('zh-CN') : '-'],
                            ].map(([label, value]) => (
                                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <Text type="secondary">{label}</Text>
                                    <Text strong>{String(value || '-')}</Text>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
            </Row>
        </Spin>
    );
}
