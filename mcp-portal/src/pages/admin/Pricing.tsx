import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';

const { Text } = Typography;

export default function AdminPricing() {
    const { token } = useOutletContext<{ token: string }>();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/mcp/admin/pricing', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { setPlans(d.data || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0 }}><DollarOutlined style={{ marginRight: 8 }} />定价管理</h2>
                <Text type="secondary">管理 MCP 服务定价方案</Text>
            </div>
            <Card>
                <Table dataSource={plans} rowKey="id" loading={loading} size="middle"
                    columns={[
                        { title: '方案名称', dataIndex: 'name' },
                        { title: '类型', dataIndex: 'type', render: (t: string) => <Tag>{t === 'per_call' ? '按次' : '包月'}</Tag> },
                        { title: '单价/次', dataIndex: 'pricePerCall', render: (v: number) => `¥${v}` },
                        { title: '月费', dataIndex: 'monthlyPrice', render: (v: number) => `¥${v}` },
                        { title: '免费额度', dataIndex: 'freeQuota', render: (v: number) => `${v} 次` },
                        { title: '状态', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag> },
                    ]}
                />
            </Card>
        </div>
    );
}
