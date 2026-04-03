import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Table, Tag, Typography, Statistic, Row, Col, Spin, Empty } from 'antd';
import { AppstoreOutlined, TeamOutlined, DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface TaskItem {
    id: number; name: string; status: string; type: string;
    budget: number; peopleNeeded: number; appliedCount: number;
    confirmedCount: number; completedCount: number;
    settlement: number | null; createdAt: string;
}
interface BusinessData {
    tasks: TaskItem[];
    summary: { totalTasks: number; totalBudget: number; totalApplied: number; completedRevenue: number };
}

const statusMap: Record<string, { color: string; label: string }> = {
    open: { color: 'blue', label: '招募中' },
    in_progress: { color: 'orange', label: '进行中' },
    completed: { color: 'green', label: '已完成' },
    cancelled: { color: 'default', label: '已取消' },
};

export default function Business() {
    const { apiKey } = useOutletContext<{ apiKey: string }>();
    const [data, setData] = useState<BusinessData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/mcp/apps/me/business', { headers: { 'Authorization': `Bearer ${apiKey}` } })
            .then(r => r.json())
            .then(d => { if (d.code === 0) setData(d.data); })
            .finally(() => setLoading(false));
    }, [apiKey]);

    const columns = [
        {
            title: '任务名称', dataIndex: 'name', key: 'name',
            render: (n: string, r: TaskItem) => (
                <div>
                    <Text strong>{n}</Text>
                    <br /><Text type="secondary" style={{ fontSize: 12 }}>{r.type} · {new Date(r.createdAt).toLocaleDateString('zh-CN')}</Text>
                </div>
            ),
        },
        {
            title: '状态', dataIndex: 'status', key: 'status', width: 100,
            render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.label || s}</Tag>,
        },
        {
            title: '预算', dataIndex: 'budget', key: 'budget', width: 120,
            render: (b: number) => <Text strong>¥{b.toLocaleString()}</Text>,
        },
        { title: '需求人数', dataIndex: 'peopleNeeded', key: 'peopleNeeded', width: 90 },
        {
            title: '申请/录用', key: 'apply', width: 100,
            render: (_: unknown, r: TaskItem) => (
                <span>
                    <Text type="secondary">{r.appliedCount}</Text> / <Text strong style={{ color: '#52c41a' }}>{r.confirmedCount}</Text>
                </span>
            ),
        },
        {
            title: '结算金额', dataIndex: 'settlement', key: 'settlement', width: 120,
            render: (s: number | null) => s != null ? <Text strong style={{ color: '#52c41a' }}>¥{s.toLocaleString()}</Text> : <Text type="secondary">-</Text>,
        },
    ];

    return (
        <Spin spinning={loading}>
            <Title level={4}>业务数据</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>通过 MCP 发布的任务和收益情况</Text>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic title="发布任务数" value={data?.summary?.totalTasks || 0} prefix={<AppstoreOutlined />} valueStyle={{ color: '#6366f1' }} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic title="总预算" value={data?.summary?.totalBudget || 0} prefix={<DollarOutlined />} precision={0} suffix="¥" />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic title="总申请人数" value={data?.summary?.totalApplied || 0} prefix={<TeamOutlined />} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic title="完成结算" value={data?.summary?.completedRevenue || 0} prefix={<CheckCircleOutlined />} precision={0} suffix="¥" valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
            </Row>

            <Card title="任务列表" style={{ borderRadius: 12 }}>
                {data?.tasks?.length ? (
                    <Table columns={columns} dataSource={data.tasks} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
                ) : (
                    <Empty description="暂无通过 MCP 发布的任务" />
                )}
            </Card>
        </Spin>
    );
}
