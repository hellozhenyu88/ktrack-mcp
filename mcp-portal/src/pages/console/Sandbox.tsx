import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Button, Select, Input, InputNumber, Typography, Tag, Spin, message, Modal } from 'antd';
import {
    ThunderboltOutlined, SendOutlined, CodeOutlined,
    CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

/* ── 工具定义：含表单字段 ── */
const TOOLS = [
    {
        name: 'search_tasks',
        label: '🔍 搜索任务',
        desc: '搜索平台上的任务列表',
        fields: [
            { key: 'search', label: '搜索关键词', type: 'text', placeholder: '如：拍摄、设计', default: '' },
            { key: 'status', label: '任务状态', type: 'select', options: ['open', 'in_progress', 'completed'], default: 'open' },
            { key: 'page', label: '页码', type: 'number', default: 1 },
            { key: 'pageSize', label: '每页条数', type: 'number', default: 5 },
        ],
    },
    {
        name: 'publish_task',
        label: '📝 发布任务',
        desc: '发布一个新的用工任务到平台',
        fields: [
            { key: 'name', label: '任务名称', type: 'text', placeholder: '如：春熙路商圈实地拍摄', default: '春熙路商圈实地拍摄' },
            { key: 'type', label: '任务类型', type: 'select', options: ['实地拍摄', '视频制作', '软件开发', 'UI设计', '数据采集', '文案撰写'], default: '实地拍摄' },
            { key: 'description', label: '任务描述', type: 'textarea', placeholder: '详细描述任务要求', default: '前往春熙路 IFS 国际金融中心，拍摄正门及周边商圈全景照片' },
            { key: 'budget', label: '预算 (¥)', type: 'number', placeholder: '80', default: 80 },
            { key: 'location', label: '工作地点', type: 'text', placeholder: '如：成都市锦江区春熙路', default: '成都市锦江区春熙路' },
            { key: 'enterpriseId', label: '企业 ID', type: 'number', default: 1 },
        ],
    },
    {
        name: 'apply_task',
        label: '🙋 报名任务',
        desc: '劳动者报名申请一个任务',
        fields: [
            { key: 'taskId', label: '任务 ID', type: 'number', default: 1 },
            { key: 'freelancerId', label: '劳动者 ID', type: 'number', default: 2 },
            { key: 'coverLetter', label: '申请理由', type: 'textarea', placeholder: '介绍你的相关经验', default: '我有丰富的实地拍摄经验' },
        ],
    },
    {
        name: 'accept_application',
        label: '✅ 录用申请人',
        desc: '录用某任务的一个申请人',
        fields: [
            { key: 'taskId', label: '任务 ID', type: 'number', default: 1 },
            { key: 'applicationId', label: '申请 ID', type: 'number', default: 1 },
        ],
    },
    {
        name: 'submit_progress',
        label: '📊 提交进度',
        desc: '劳动者提交工作进度更新',
        fields: [
            { key: 'taskId', label: '任务 ID', type: 'number', default: 1 },
            { key: 'freelancerId', label: '劳动者 ID', type: 'number', default: 2 },
            { key: 'content', label: '进度内容', type: 'textarea', placeholder: '描述当前进度', default: '已完成现场拍摄，共拍摄 20 张照片' },
        ],
    },
    {
        name: 'approve_completion',
        label: '🏁 验收完成',
        desc: '企业验收任务完成',
        fields: [
            { key: 'taskId', label: '任务 ID', type: 'number', default: 1 },
        ],
    },
];

export default function Sandbox() {
    const { apiKey } = useOutletContext<{ apiKey: string; appInfo: any }>();
    const [selectedTool, setSelectedTool] = useState(TOOLS[0].name);
    const [formValues, setFormValues] = useState<Record<string, any>>(() => {
        const t = TOOLS[0];
        const vals: Record<string, any> = {};
        t.fields.forEach(f => { vals[f.key] = f.default; });
        return vals;
    });
    const [showJson, setShowJson] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [callHistory, setCallHistory] = useState<Array<{ tool: string; ok: boolean; time: string; result: string }>>([]);
    const [testPassed, setTestPassed] = useState(false);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);

    const currentTool = TOOLS.find(t => t.name === selectedTool)!;

    const handleToolChange = (name: string) => {
        setSelectedTool(name);
        const tool = TOOLS.find(t => t.name === name)!;
        const vals: Record<string, any> = {};
        tool.fields.forEach(f => { vals[f.key] = f.default; });
        setFormValues(vals);
        setResult(null);
        setTestPassed(false);
    };

    const handleFieldChange = (key: string, value: any) => {
        setFormValues(prev => ({ ...prev, [key]: value }));
    };

    const getParams = () => {
        const params: Record<string, any> = {};
        currentTool.fields.forEach(f => {
            params[f.key] = formValues[f.key] ?? f.default;
        });
        return params;
    };

    const handleExecute = async () => {
        const parsedParams = getParams();
        setLoading(true);
        setResult(null);

        try {
            // Step 1: Initialize MCP session
            const initRes = await fetch('/mcp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'initialize',
                    params: {
                        protocolVersion: '2025-03-26',
                        capabilities: {},
                        clientInfo: { name: 'sandbox', version: '1.0.0' },
                    },
                }),
            });

            const sessionId = initRes.headers.get('mcp-session-id');
            const initContentType = initRes.headers.get('content-type') || '';
            let initData: any;
            if (initContentType.includes('text/event-stream')) {
                const text = await initRes.text();
                const dataLine = text.split('\n').find(line => line.startsWith('data:'));
                initData = dataLine ? JSON.parse(dataLine.replace(/^data:\s*/, '')) : {};
            } else {
                initData = await initRes.json();
            }

            if (!sessionId) {
                setResult(JSON.stringify({ error: '无法建立 MCP 会话', detail: initData }, null, 2));
                setLoading(false);
                return;
            }

            // Step 2: Send initialized notification
            await fetch('/mcp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream',
                    'Authorization': `Bearer ${apiKey}`,
                    'mcp-session-id': sessionId,
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'notifications/initialized',
                }),
            });

            // Step 3: Call the tool
            const callRes = await fetch('/mcp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream',
                    'Authorization': `Bearer ${apiKey}`,
                    'mcp-session-id': sessionId,
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/call',
                    params: {
                        name: selectedTool,
                        arguments: parsedParams,
                    },
                }),
            });

            const contentType = callRes.headers.get('content-type') || '';
            let callData: any;
            if (contentType.includes('text/event-stream')) {
                const text = await callRes.text();
                const dataLine = text.split('\n').find(line => line.startsWith('data:'));
                if (!dataLine) throw new Error('SSE 响应中未找到 data 行');
                callData = JSON.parse(dataLine.replace(/^data:\s*/, ''));
            } else {
                callData = await callRes.json();
            }
            const resultStr = JSON.stringify(callData, null, 2);
            setResult(resultStr);

            const isOk = !callData.error;
            if (isOk && selectedTool === 'publish_task') {
                setTestPassed(true);
            }
            setCallHistory(prev => [{
                tool: selectedTool,
                ok: isOk,
                time: new Date().toLocaleTimeString('zh-CN'),
                result: resultStr.slice(0, 200),
            }, ...prev].slice(0, 10));

            // Step 4: Close session
            await fetch('/mcp', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'mcp-session-id': sessionId,
                },
            }).catch(() => {});

        } catch (err: any) {
            const errMsg = JSON.stringify({ error: '请求失败', message: err.message }, null, 2);
            setResult(errMsg);
            setCallHistory(prev => [{
                tool: selectedTool, ok: false,
                time: new Date().toLocaleTimeString('zh-CN'),
                result: errMsg.slice(0, 200),
            }, ...prev].slice(0, 10));
        } finally {
            setLoading(false);
        }
    };

    /* ── 渲染表单字段 ── */
    const renderField = (field: any) => {
        const value = formValues[field.key] ?? field.default;
        const labelStyle = { display: 'block', marginBottom: 4, fontSize: 13, color: '#374151', fontWeight: 600 as const };
        const wrapStyle = { marginBottom: 14 };

        switch (field.type) {
            case 'text':
                return (
                    <div key={field.key} style={wrapStyle}>
                        <label style={labelStyle}>{field.label}</label>
                        <Input value={value} placeholder={field.placeholder}
                            onChange={e => handleFieldChange(field.key, e.target.value)} />
                    </div>
                );
            case 'textarea':
                return (
                    <div key={field.key} style={wrapStyle}>
                        <label style={labelStyle}>{field.label}</label>
                        <TextArea rows={2} value={value} placeholder={field.placeholder}
                            onChange={e => handleFieldChange(field.key, e.target.value)} />
                    </div>
                );
            case 'number':
                return (
                    <div key={field.key} style={wrapStyle}>
                        <label style={labelStyle}>{field.label}</label>
                        <InputNumber value={value} style={{ width: '100%' }}
                            onChange={v => handleFieldChange(field.key, v)} />
                    </div>
                );
            case 'select':
                return (
                    <div key={field.key} style={wrapStyle}>
                        <label style={labelStyle}>{field.label}</label>
                        <Select value={value} style={{ width: '100%' }}
                            options={field.options.map((o: string) => ({ value: o, label: o }))}
                            onChange={v => handleFieldChange(field.key, v)} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div>
            <Title level={4}>
                <ThunderboltOutlined style={{ color: '#6366f1', marginRight: 8 }} />
                试用沙盒
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                在这里直接调用 MCP 工具，实时测试 API 效果。每次调用将消耗免费额度。
            </Text>

            <div style={{ display: 'flex', gap: 20 }}>

                {/* 左侧：工具选择 + 表单 */}
                <div style={{ flex: '0 0 50%', minWidth: 0 }}>
                    <Card size="small" title="选择工具" style={{ borderRadius: 12, marginBottom: 16 }}>
                        <Select
                            value={selectedTool}
                            onChange={handleToolChange}
                            style={{ width: '100%', marginBottom: 12 }}
                            options={TOOLS.map(t => ({ value: t.name, label: t.label }))}
                        />
                        <div style={{
                            background: '#f5f3ff', borderRadius: 8, padding: '10px 14px',
                            border: '1px solid #e0e7ff',
                        }}>
                            <Text style={{ fontSize: 13, color: '#4338ca' }}>
                                <CodeOutlined style={{ marginRight: 6 }} />
                                {currentTool.desc}
                            </Text>
                        </div>
                    </Card>

                    <Card size="small"
                        title="参数设置"
                        style={{ borderRadius: 12, marginBottom: 16 }}
                        extra={
                            <Button type="text" size="small"
                                icon={<CodeOutlined />}
                                onClick={() => setShowJson(!showJson)}
                                style={{ fontSize: 12 }}>
                                {showJson ? '表单模式' : '查看 JSON'}
                            </Button>
                        }
                    >
                        {showJson ? (
                            <pre style={{
                                background: '#0f172a', borderRadius: 8,
                                padding: 14, margin: 0, fontSize: 12.5,
                                lineHeight: 1.6, overflowX: 'auto',
                            }}>
                                <code style={{
                                    color: '#4ade80',
                                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                                }}>
                                    {JSON.stringify(getParams(), null, 2)}
                                </code>
                            </pre>
                        ) : (
                            <div>
                                {currentTool.fields.map(renderField)}
                            </div>
                        )}
                    </Card>

                    <Button
                        type="primary"
                        size="large"
                        block
                        icon={<SendOutlined />}
                        loading={loading}
                        onClick={() => {
                            if (selectedTool === 'publish_task' && testPassed) {
                                setConfirmModalOpen(true);
                            } else {
                                handleExecute();
                            }
                        }}
                        style={{
                            height: 48, borderRadius: 12, fontSize: 15,
                            ...(selectedTool === 'publish_task' && testPassed
                                ? { background: '#059669', borderColor: '#059669' }
                                : {}),
                        }}
                    >
                        {loading ? '调用中...' : (
                            selectedTool === 'publish_task'
                                ? (testPassed ? '✅ 确认发布' : '🧪 测试发布任务')
                                : `执行 ${currentTool.label}`
                        )}
                    </Button>

                    <Modal
                        title="确认发布任务"
                        open={confirmModalOpen}
                        onOk={() => {
                            setConfirmModalOpen(false);
                            setTestPassed(false);
                            message.success('任务已正式发布，等待人才承接！');
                        }}
                        onCancel={() => setConfirmModalOpen(false)}
                        okText="确认发布"
                        cancelText="再想想"
                        okButtonProps={{ style: { background: '#059669', borderColor: '#059669' } }}
                    >
                        <div style={{ padding: '12px 0', textAlign: 'center' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
                            <p style={{ fontSize: 15, color: '#374151', marginBottom: 8 }}>
                                确认后，将有<strong style={{ color: '#059669' }}>真人</strong>开始承接任务
                            </p>
                            <p style={{ fontSize: 13, color: '#6b7280' }}>
                                任务发布后将对平台所有劳动者可见，请确认信息无误。
                            </p>
                        </div>
                    </Modal>
                </div>

                {/* 右侧：返回结果 + 历史 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Card
                        size="small"
                        title={
                            <span>
                                返回结果
                                {result && !loading && (
                                    <Tag color={result.includes('"error"') ? 'red' : 'green'}
                                        style={{ marginLeft: 8 }}>
                                        {result.includes('"error"') ? 'ERROR' : 'SUCCESS'}
                                    </Tag>
                                )}
                            </span>
                        }
                        style={{ borderRadius: 12, marginBottom: 16 }}
                    >
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                <Spin size="large" />
                                <div style={{ marginTop: 12, color: '#6366f1' }}>正在通过 MCP 协议调用…</div>
                            </div>
                        ) : result ? (
                            <pre style={{
                                background: '#0f172a', borderRadius: 8,
                                padding: 16, margin: 0, maxHeight: 400,
                                overflow: 'auto', fontSize: 12.5, lineHeight: 1.6,
                            }}>
                                <code style={{
                                    color: '#4ade80',
                                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                                }}>
                                    {result}
                                </code>
                            </pre>
                        ) : (
                            <div style={{
                                textAlign: 'center', padding: '50px 20px',
                                color: '#9ca3af',
                            }}>
                                <ThunderboltOutlined style={{ fontSize: 36, marginBottom: 12, display: 'block', opacity: 0.4 }} />
                                选择工具并点击"执行"查看返回结果
                            </div>
                        )}
                    </Card>

                    {/* 调用历史 */}
                    {callHistory.length > 0 && (
                        <Card size="small" title="调用历史" style={{ borderRadius: 12 }}>
                            {callHistory.map((h, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '6px 0',
                                    borderBottom: i < callHistory.length - 1 ? '1px solid #f0f0f0' : 'none',
                                    fontSize: 13,
                                }}>
                                    {h.ok
                                        ? <CheckCircleOutlined style={{ color: '#22c55e' }} />
                                        : <CloseCircleOutlined style={{ color: '#ef4444' }} />}
                                    <Tag style={{ margin: 0 }}>{h.tool}</Tag>
                                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>{h.time}</Text>
                                </div>
                            ))}
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
