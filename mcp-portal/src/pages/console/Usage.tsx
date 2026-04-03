import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Table, Tag, Typography, Space, Button, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function Usage() {
    const { apiKey } = useOutletContext<{ apiKey: string }>();
    const [usage, setUsage] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);

    const fetchUsage = () => {
        setLoading(true);
        fetch(`/api/mcp/apps/me/usage?days=${days}`, { headers: { 'Authorization': `Bearer ${apiKey}` } })
            .then(r => r.json())
            .then(d => { if (d.code === 0) setUsage(d.data); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchUsage(); }, [apiKey, days]);

    const columns = [
        {
            title: '工具名称', dataIndex: 'tool', key: 'tool',
            render: (t: string) => {
                const colors: Record<string, string> = {
                    'initialize': 'blue', 'tools/call': 'purple', 'tools/list': 'cyan',
                    'resources/read': 'green', 'resources/list': 'lime',
                };
                return <Tag color={colors[t] || 'default'}>{t}</Tag>;
            },
        },
        { title: '调用次数', dataIndex: 'calls', key: 'calls', sorter: (a: any, b: any) => a.calls - b.calls },
        { title: '平均耗时(ms)', dataIndex: 'avgDuration', key: 'avgDuration' },
    ];

    return (
        <Spin spinning={loading}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>调用监控</Title>
                <Space>
                    {[7, 14, 30].map(d => (
                        <Button key={d} type={days === d ? 'primary' : 'default'} size="small" onClick={() => setDays(d)}>{d}天</Button>
                    ))}
                    <Button icon={<ReloadOutlined />} size="small" onClick={fetchUsage}>刷新</Button>
                </Space>
            </div>

            <Card title={`最近 ${usage?.period || `${days}天`} 共 ${usage?.totalCalls || 0} 次调用`}
                style={{ borderRadius: 12 }}>
                <Table columns={columns} dataSource={usage?.byTool || []} rowKey="tool"
                    pagination={false} size="middle" />
            </Card>
        </Spin>
    );
}
