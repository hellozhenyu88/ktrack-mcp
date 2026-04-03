import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Table, Tag, Typography, Statistic, Row, Col, Spin, Empty } from 'antd';
import { DollarOutlined, WalletOutlined, TransactionOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function Billing() {
    const { apiKey } = useOutletContext<{ apiKey: string }>();
    const [balance, setBalance] = useState<any>(null);
    const [billing, setBilling] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const headers = { 'Authorization': `Bearer ${apiKey}` };
        Promise.all([
            fetch('/api/mcp/apps/me/balance', { headers }).then(r => r.json()),
            fetch('/api/mcp/apps/me/billing', { headers }).then(r => r.json()),
        ]).then(([b, bl]) => {
            if (b.code === 0) setBalance(b.data);
            if (bl.code === 0) setBilling(bl.data || []);
        }).finally(() => setLoading(false));
    }, [apiKey]);

    const typeLabel: Record<string, { label: string; color: string }> = {
        recharge: { label: '充值', color: 'green' },
        deduction: { label: '扣费', color: 'red' },
        refund: { label: '退款', color: 'blue' },
        free_quota: { label: '免费额度', color: 'purple' },
    };

    const columns = [
        {
            title: '类型', dataIndex: 'type', key: 'type', width: 100,
            render: (t: string) => <Tag color={typeLabel[t]?.color}>{typeLabel[t]?.label || t}</Tag>,
        },
        {
            title: '金额', dataIndex: 'amount', key: 'amount', width: 120,
            render: (a: number, r: any) => <Text strong style={{ color: r.type === 'recharge' || r.type === 'refund' ? '#52c41a' : '#ff4d4f' }}>
                {r.type === 'deduction' ? '-' : '+'}¥{Math.abs(a).toFixed(2)}
            </Text>,
        },
        { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
        {
            title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
            render: (d: string) => new Date(d).toLocaleString('zh-CN'),
        },
    ];

    return (
        <Spin spinning={loading}>
            <Title level={4}>账单</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>余额、充值与消费记录</Text>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic title="当前余额" value={balance?.balance || 0} prefix={<WalletOutlined />} precision={2} suffix="¥" valueStyle={{ color: '#6366f1' }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic title="累计消费" value={balance?.totalSpent || 0} prefix={<TransactionOutlined />} precision={2} suffix="¥" valueStyle={{ color: '#ff4d4f' }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic title="免费剩余" value={balance?.freeRemaining || 0} prefix={<DollarOutlined />} suffix="次" valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
            </Row>

            <Card title="交易记录" style={{ borderRadius: 12 }}>
                {billing.length > 0 ? (
                    <Table columns={columns} dataSource={billing} rowKey="id" pagination={{ pageSize: 20 }} size="middle" />
                ) : (
                    <Empty description="暂无交易记录" />
                )}
            </Card>
        </Spin>
    );
}
