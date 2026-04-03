import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Layout, Menu, Typography, Button, Input, Modal, message, Space } from 'antd';
import type { MenuProps } from 'antd';
import {
    AppstoreOutlined, BarChartOutlined, DollarOutlined,
    KeyOutlined, LogoutOutlined, HomeOutlined, SendOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

/** 管理端使用企业端同一套 token (JWT) */
function getStoredToken() { return localStorage.getItem('mcp_admin_token') || ''; }

export default function AdminLayout() {
    const [token, setToken] = useState(getStoredToken());
    const [loginOpen, setLoginOpen] = useState(!token);
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [sending, setSending] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 倒计时
    useEffect(() => {
        if (countdown > 0) {
            timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [countdown]);

    const handleSendCode = async () => {
        if (!/^1[3-9]\d{9}$/.test(phone)) { message.warning('请输入正确的手机号'); return; }
        setSending(true);
        try {
            const res = await fetch('/api/auth/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json();
            if (data.code === 0) {
                message.success('验证码已发送');
                setCountdown(60);
            } else {
                message.error(data.message || '发送失败');
            }
        } catch { message.error('网络错误'); }
        finally { setSending(false); }
    };

    const handleLogin = async () => {
        if (!phone || !code) { message.warning('请输入手机号和验证码'); return; }
        setVerifying(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code }),
            });
            const data = await res.json();
            if (data.code === 0 && data.data?.token) {
                localStorage.setItem('mcp_admin_token', data.data.token);
                setToken(data.data.token);
                setLoginOpen(false);
                message.success('登录成功');
            } else {
                message.error(data.message || '登录失败');
            }
        } catch { message.error('网络错误'); }
        finally { setVerifying(false); }
    };

    const handleLogout = () => {
        localStorage.removeItem('mcp_admin_token');
        setToken('');
        setLoginOpen(true);
    };

    // 验证 token 有效性
    useEffect(() => {
        if (token) {
            fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => { if (d.code !== 0) handleLogout(); })
                .catch(() => handleLogout());
        }
    }, [token]);

    const menuItems: MenuProps['items'] = [
        { key: '/admin', icon: <AppstoreOutlined />, label: '应用管理' },
        { key: '/admin/stats', icon: <BarChartOutlined />, label: '调用统计' },
        { key: '/admin/pricing', icon: <DollarOutlined />, label: '定价管理' },
    ];

    if (!token) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b' }}>
                <Modal title="🔐 MCP 管理端登录" open={true} closable={false} footer={null} width={400}>
                    <p style={{ color: '#666', marginBottom: 16 }}>使用平台管理员账号登录</p>
                    <Input
                        placeholder="手机号"
                        size="large"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        style={{ marginBottom: 12 }}
                    />
                    <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                        <Input
                            placeholder="验证码"
                            size="large"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            onPressEnter={handleLogin}
                            style={{ flex: 1 }}
                        />
                        <Button size="large" onClick={handleSendCode} loading={sending} disabled={countdown > 0} icon={<SendOutlined />}>
                            {countdown > 0 ? `${countdown}s` : '发送验证码'}
                        </Button>
                    </Space.Compact>
                    <Button type="primary" block size="large" loading={verifying} onClick={handleLogin} icon={<KeyOutlined />}>
                        登录
                    </Button>
                </Modal>
            </div>
        );
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} width={220}
                style={{ background: '#fff', borderRight: '1px solid #f0f0f0', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, overflow: 'auto' }}
            >
                <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f0f0f0', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>S</div>
                    {!collapsed && <div><div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Synapse 管理端</div><div style={{ fontSize: 10, color: '#999' }}>MCP Admin</div></div>}
                </div>
                <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    style={{ border: 'none', padding: 8 }} />
                <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, padding: '0 16px' }}>
                    <Link to="/">
                        <Button block icon={<HomeOutlined />} type="text" style={{ textAlign: 'left' }}>
                            {!collapsed && '返回官网'}
                        </Button>
                    </Link>
                </div>
                <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, padding: '0 16px' }}>
                    <Button block icon={<LogoutOutlined />} onClick={handleLogout} type="text" danger>
                        {!collapsed && '退出'}
                    </Button>
                </div>
            </Sider>
            <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
                <Content style={{ margin: 24, minHeight: 'calc(100vh - 48px)' }}>
                    <Outlet context={{ token }} />
                </Content>
            </Layout>
        </Layout>
    );
}
