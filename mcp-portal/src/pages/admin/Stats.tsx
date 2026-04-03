import { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Statistic } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';

const { Text } = Typography;

export default function AdminStats() {
    const { token } = useOutletContext<{ token: string }>();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetch('/api/mcp/admin/usage?days=30', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => setStats(d.data))
            .catch(() => {});
    }, []);

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0 }}><BarChartOutlined style={{ marginRight: 8 }} />全局调用统计</h2>
                <Text type="secondary">过去 30 天的 MCP 调用情况</Text>
            </div>
            {stats && (
                <Row gutter={[16, 16]}>
                    <Col span={6}><Card><Statistic title="总调用次数" value={stats.totalCalls || 0} /></Card></Col>
                    <Col span={6}><Card><Statistic title="总计费金额" value={stats.totalBilled || 0} prefix="¥" precision={2} /></Card></Col>
                    <Col span={6}><Card><Statistic title="活跃应用" value={stats.activeApps || 0} suffix="个" /></Card></Col>
                    <Col span={6}><Card><Statistic title="日均调用" value={Math.round((stats.totalCalls || 0) / 30)} /></Card></Col>
                </Row>
            )}
            {!stats && <Card loading style={{ minHeight: 200 }} />}
        </div>
    );
}
