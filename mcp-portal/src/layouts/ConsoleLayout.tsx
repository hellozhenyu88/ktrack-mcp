import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { Layout, Menu, Typography, Space, Button, Input, Modal, message } from 'antd';
import type { MenuProps } from 'antd';
import {
    DashboardOutlined, BarChartOutlined, AppstoreOutlined,
    DollarOutlined, KeyOutlined, LogoutOutlined, ThunderboltOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function getStoredKey() { return localStorage.getItem('mcp_api_key') || ''; }

export default function ConsoleLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    // 从 URL 参数中读取 key（从申请页面跳转过来时携带）
    const urlParams = new URLSearchParams(location.search);
    const urlKey = urlParams.get('key');
    const initialKey = urlKey || getStoredKey();

    // 如果 URL 中携带了 key，自动存入 localStorage
    if (urlKey) {
        localStorage.setItem('mcp_api_key', urlKey);
    }

    const [apiKey, setApiKey] = useState(initialKey);
    const [loginModalOpen, setLoginModalOpen] = useState(!initialKey);
    const [inputKey, setInputKey] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [appInfo, setAppInfo] = useState<any>(null);

    // 清除 URL 中的 key 参数（安全考虑，避免 key 暴露在地址栏）
    useEffect(() => {
        if (urlKey) {
            navigate(location.pathname, { replace: true });
        }
    }, []);

    const handleLogin = async () => {
        if (!inputKey.trim()) { message.warning('请输入 API Key'); return; }
        setVerifying(true);
        try {
            const res = await fetch('/api/mcp/apps/me', {
                headers: { 'Authorization': `Bearer ${inputKey.trim()}` },
            });
            const data = await res.json();
            if (data.code === 0) {
                localStorage.setItem('mcp_api_key', inputKey.trim());
                setApiKey(inputKey.trim());
                setAppInfo(data.data);
                setLoginModalOpen(false);
                message.success(`欢迎回来，${data.data.name}`);
            } else {
                message.error('API Key 无效或已过期');
            }
        } catch { message.error('连接失败'); }
        finally { setVerifying(false); }
    };

    const handleLogout = () => {
        localStorage.removeItem('mcp_api_key');
        setApiKey('');
        setAppInfo(null);
        setLoginModalOpen(true);
        navigate('/console');
    };

    useEffect(() => {
        if (apiKey && !appInfo) {
            fetch('/api/mcp/apps/me', { headers: { 'Authorization': `Bearer ${apiKey}` } })
                .then(r => r.json())
                .then(d => { if (d.code === 0) setAppInfo(d.data); else handleLogout(); })
                .catch(() => handleLogout());
        }
    }, [apiKey]);

    const menuItems: MenuProps['items'] = [
        { key: '/console', icon: <DashboardOutlined />, label: '概览' },
        { key: '/console/sandbox', icon: <ThunderboltOutlined />, label: '试用沙盒' },
        { key: '/console/quickstart', icon: <KeyOutlined />, label: '接入指南' },
        { key: '/console/usage', icon: <BarChartOutlined />, label: '调用监控' },
        { key: '/console/business', icon: <AppstoreOutlined />, label: '业务数据' },
        { key: '/console/billing', icon: <DollarOutlined />, label: '账单' },
    ];

    if (!apiKey) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f5f5' }}>
                <Modal title="🔑 开发者登录" open={true} closable={false} footer={null} width={440}>
                    <p style={{ color: '#666', marginBottom: 20 }}>请输入您的 MCP API Key 登录开发者控制台</p>
                    <Input.Password
                        placeholder="kt_live_xxxxxxxxxxxxxxxx"
                        size="large"
                        value={inputKey}
                        onChange={e => setInputKey(e.target.value)}
                        onPressEnter={handleLogin}
                        style={{ marginBottom: 16, fontFamily: 'monospace' }}
                    />
                    <Button type="primary" block size="large" loading={verifying} onClick={handleLogin} icon={<KeyOutlined />}>
                        验证并登录
                    </Button>
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            还没有 Key？<Link to="/apply" style={{ color: '#6366f1' }}>申请接入</Link>
                        </Text>
                    </div>
                </Modal>
            </div>
        );
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} width={220}
                className="console-sider"
                style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, overflow: 'auto' }}
            >
                <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f0f0f0', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>T</div>
                    {!collapsed && <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>TimeLinker</div>}
                </div>
                <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    style={{ border: 'none', padding: 8 }} />
                <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, padding: '0 16px' }}>
                    <Button block icon={<LogoutOutlined />} onClick={handleLogout} type="text" danger>
                        {!collapsed && '退出'}
                    </Button>
                </div>
            </Sider>
            <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
                <Content style={{ margin: 24, minHeight: 'calc(100vh - 48px)' }}>
                    <Outlet context={{ apiKey, appInfo }} />
                </Content>
            </Layout>
        </Layout>
    );
}
