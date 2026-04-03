import { useState, useEffect } from 'react';
import { Table, Tag, Button, Card, Space, Modal, Typography, Statistic, Row, Col, message, Tabs, Popconfirm, Input } from 'antd';
import {
    CheckCircleOutlined, CloseCircleOutlined, PauseCircleOutlined,
    CopyOutlined, ReloadOutlined, ApiOutlined, SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useOutletContext } from 'react-router-dom';

const { Text, Paragraph } = Typography;

interface McpAppItem {
    id: number;
    name: string;
    description: string | null;
    contactName: string;
    contactEmail: string;
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    balance: number;
    keyCount: number;
    totalCalls: number;
    createdAt: string;
}

const statusMap: Record<string, { color: string; label: string }> = {
    pending: { color: 'orange', label: '待审核' },
    approved: { color: 'green', label: '已通过' },
    rejected: { color: 'red', label: '已拒绝' },
    suspended: { color: 'default', label: '已暂停' },
};

export default function AdminApps() {
    const { token } = useOutletContext<{ token: string }>();
    const [apps, setApps] = useState<McpAppItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState({ pending: 0, approved: 0, totalCalls: 0 });

    const headers = { 'Authorization': `Bearer ${token}` };

    const fetchApps = async () => {
        setLoading(true);
        try {
            const params = tab !== 'all' ? `?status=${tab}` : '';
            const res = await fetch(`/api/mcp/admin/apps${params}`, { headers });
            const data = await res.json();
            const list = data?.data || [];
            setApps(list);
            if (tab === 'all') {
                setStats({
                    pending: list.filter((a: McpAppItem) => a.status === 'pending').length,
                    approved: list.filter((a: McpAppItem) => a.status === 'approved').length,
                    totalCalls: list.reduce((sum: number, a: McpAppItem) => sum + a.totalCalls, 0),
                });
            }
        } catch { message.error('加载失败'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchApps(); }, [tab]);

    const handleApprove = async (id: number) => {
        try {
            const res = await fetch(`/api/mcp/admin/apps/${id}/approve`, { method: 'PUT', headers });
            const data = await res.json();
            const apiKey = data?.data?.apiKey;
            if (apiKey) {
                Modal.success({
                    title: '审核通过 — API Key 已生成',
                    width: 520,
                    content: (
                        <div style={{ marginTop: 16 }}>
                            <Text type="warning" strong>⚠️ 请妥善保存，此 Key 仅展示一次：</Text>
                            <Paragraph
                                copyable={{ text: apiKey, icon: <CopyOutlined /> }}
                                code
                                style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 13, wordBreak: 'break-all' }}
                            >
                                {apiKey}
                            </Paragraph>
                        </div>
                    ),
                });
            }
            fetchApps();
        } catch { message.error('操作失败'); }
    };

    const handleAction = async (id: number, action: string, successMsg: string) => {
        try {
            await fetch(`/api/mcp/admin/apps/${id}/${action}`, { method: 'PUT', headers });
            message.success(successMsg);
            fetchApps();
        } catch { message.error('操作失败'); }
    };

    const filteredApps = search
        ? apps.filter(a => a.name.includes(search) || a.contactName.includes(search) || a.contactEmail.includes(search))
        : apps;

    const columns: ColumnsType<McpAppItem> = [
        { title: 'ID', dataIndex: 'id', width: 60 },
        {
            title: '应用名称', dataIndex: 'name', width: 180,
            render: (name, record) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{name}</div>
                    {record.description && <Text type="secondary" style={{ fontSize: 12 }}>{record.description.slice(0, 40)}</Text>}
                </div>
            ),
        },
        {
            title: '联系人', width: 160,
            render: (_, record) => (
                <div>
                    <div>{record.contactName}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.contactEmail}</Text>
                </div>
            ),
        },
        {
            title: '状态', dataIndex: 'status', width: 100,
            render: (status: string) => {
                const s = statusMap[status] || { color: 'default', label: status };
                return <Tag color={s.color}>{s.label}</Tag>;
            },
        },
        { title: 'Key 数', dataIndex: 'keyCount', width: 80, align: 'center' as const },
        { title: '调用量', dataIndex: 'totalCalls', width: 90, align: 'center' as const, render: (v: number) => v.toLocaleString() },
        { title: '余额(¥)', dataIndex: 'balance', width: 90, align: 'center' as const, render: (v: number) => v.toFixed(2) },
        { title: '申请时间', dataIndex: 'createdAt', width: 160, render: (v: string) => new Date(v).toLocaleString('zh-CN') },
        {
            title: '操作', fixed: 'right' as const, width: 200,
            render: (_, record) => (
                <Space size={4}>
                    {record.status === 'pending' && (
                        <>
                            <Popconfirm title="确定通过？通过后将自动生成 API Key。" onConfirm={() => handleApprove(record.id)}>
                                <Button type="primary" size="small" icon={<CheckCircleOutlined />}>通过</Button>
                            </Popconfirm>
                            <Popconfirm title="确定拒绝？" onConfirm={() => handleAction(record.id, 'reject', '已拒绝')}>
                                <Button danger size="small" icon={<CloseCircleOutlined />}>拒绝</Button>
                            </Popconfirm>
                        </>
                    )}
                    {record.status === 'approved' && (
                        <Popconfirm title="暂停后该应用无法调用 API。" onConfirm={() => handleAction(record.id, 'suspend', '已暂停')}>
                            <Button size="small" icon={<PauseCircleOutlined />}>暂停</Button>
                        </Popconfirm>
                    )}
                    {record.status === 'suspended' && (
                        <Popconfirm title="确定恢复？" onConfirm={() => handleAction(record.id, 'activate', '已恢复')}>
                            <Button type="primary" ghost size="small" icon={<CheckCircleOutlined />}>恢复</Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0 }}><ApiOutlined style={{ marginRight: 8 }} />MCP 应用管理</h2>
                <Text type="secondary">审核开发者申请、管理 API Key、查看调用统计</Text>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}><Card><Statistic title="待审核" value={stats.pending} valueStyle={{ color: stats.pending > 0 ? '#fa8c16' : undefined }} suffix="个" /></Card></Col>
                <Col span={8}><Card><Statistic title="已通过" value={stats.approved} valueStyle={{ color: '#52c41a' }} suffix="个" /></Card></Col>
                <Col span={8}><Card><Statistic title="总调用量" value={stats.totalCalls} /></Card></Col>
            </Row>

            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Tabs activeKey={tab} onChange={setTab}
                        items={[
                            { key: 'all', label: '全部' }, { key: 'pending', label: '待审核' },
                            { key: 'approved', label: '已通过' }, { key: 'rejected', label: '已拒绝' },
                            { key: 'suspended', label: '已暂停' },
                        ]}
                        style={{ marginBottom: 0 }}
                    />
                    <Space>
                        <Input placeholder="搜索应用/联系人" prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ width: 200 }} />
                        <Button icon={<ReloadOutlined />} onClick={fetchApps}>刷新</Button>
                    </Space>
                </div>
                <Table columns={columns} dataSource={filteredApps} rowKey="id" loading={loading}
                    pagination={{ pageSize: 15, showTotal: t => `共 ${t} 条` }} scroll={{ x: 1100 }} size="middle" />
            </Card>
        </div>
    );
}
