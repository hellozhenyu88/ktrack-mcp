import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Typography, Tag, Button, message, Steps } from 'antd';
import { CopyOutlined, CheckOutlined, RocketOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

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

const GUIDES = [
    {
        key: 'cursor',
        label: 'Cursor',
        icon: '🖥️',
        steps: [
            '打开 Cursor → Settings → MCP',
            '点击 "Add new MCP server"',
            '粘贴以下配置并保存',
            '在 Chat 中输入：「帮我发布一个拍摄任务」',
        ],
    },
    {
        key: 'claude',
        label: 'Claude Desktop',
        icon: '🤖',
        steps: [
            '打开 Claude Desktop → Settings → Developer → Edit Config',
            '编辑 claude_desktop_config.json 文件',
            '粘贴以下配置到 "mcpServers" 节点',
            '重启 Claude Desktop，在对话中使用 MCP 工具',
        ],
    },
    {
        key: 'python',
        label: 'Python SDK',
        icon: '🐍',
        steps: [
            '安装依赖：pip install mcp',
            '复制以下代码到你的 Python 脚本',
            '替换 YOUR_API_KEY 为你的 Key',
            '运行脚本即可调用 MCP 工具',
        ],
    },
];

export default function QuickStart() {
    const { apiKey } = useOutletContext<{ apiKey: string; appInfo: any }>();
    const [activeGuide, setActiveGuide] = useState('cursor');
    const [copied, setCopied] = useState('');

    const cursorConfig = `{
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

    const pythonCode = `import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def main():
    async with streamablehttp_client(
        "https://mcp.timelinker.cn/mcp",
        headers={"Authorization": "Bearer ${apiKey}"}
    ) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # 搜索可用任务
            result = await session.call_tool("search_tasks", {
                "status": "open",
                "page": 1,
                "pageSize": 5
            })
            print(result)

            # 发布新任务
            result = await session.call_tool("publish_task", {
                "name": "春熙路商圈实地拍摄",
                "type": "实地拍摄",
                "description": "前往春熙路 IFS，拍摄正门照片",
                "budget": 80,
                "location": "成都市锦江区春熙路",
                "enterpriseId": 1
            })
            print(result)

asyncio.run(main())`;

    const getCodeForGuide = () => {
        if (activeGuide === 'python') return pythonCode;
        return cursorConfig;
    };

    const handleCopy = (key: string) => {
        copyText(getCodeForGuide());
        setCopied(key);
        message.success('已复制到剪贴板');
        setTimeout(() => setCopied(''), 2000);
    };

    const guide = GUIDES.find(g => g.key === activeGuide)!;

    return (
        <div>
            <Title level={4}>
                <RocketOutlined style={{ color: '#6366f1', marginRight: 8 }} />
                1 分钟接入指南
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                选择你的 AI 客户端，按步骤配置即可开始使用 TimeLinker MCP 服务。
            </Text>

            {/* 客户端选择 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {GUIDES.map(g => (
                    <Card
                        key={g.key}
                        hoverable
                        onClick={() => setActiveGuide(g.key)}
                        style={{
                            flex: 1, textAlign: 'center', cursor: 'pointer',
                            borderRadius: 12, transition: 'all 0.2s',
                            borderColor: activeGuide === g.key ? '#6366f1' : '#e5e7eb',
                            background: activeGuide === g.key ? '#f5f3ff' : '#fff',
                        }}
                        bodyStyle={{ padding: '20px 16px' }}
                    >
                        <div style={{ fontSize: 32, marginBottom: 8 }}>{g.icon}</div>
                        <Text strong style={{
                            color: activeGuide === g.key ? '#6366f1' : '#374151',
                            fontSize: 15,
                        }}>{g.label}</Text>
                    </Card>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 20 }}>
                {/* 步骤 */}
                <Card style={{ flex: '0 0 280px', borderRadius: 12 }} size="small" title={`${guide.icon} ${guide.label} 接入步骤`}>
                    <Steps
                        direction="vertical"
                        size="small"
                        current={-1}
                        items={guide.steps.map((s, i) => ({
                            title: <Text style={{ fontSize: 13 }}>{s}</Text>,
                            status: 'wait' as const,
                        }))}
                        style={{ padding: '8px 0' }}
                    />
                </Card>

                {/* 代码 */}
                <Card style={{ flex: 1, borderRadius: 12 }} size="small"
                    title={
                        <span>
                            配置代码
                            <Tag color="purple" style={{ marginLeft: 8 }}>
                                {activeGuide === 'python' ? 'Python' : 'JSON'}
                            </Tag>
                        </span>
                    }
                    extra={
                        <Button size="small" type="primary"
                            icon={copied === activeGuide ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={() => handleCopy(activeGuide)}>
                            {copied === activeGuide ? '已复制' : '复制代码'}
                        </Button>
                    }
                >
                    <pre style={{
                        background: '#0f172a', borderRadius: 8,
                        padding: 16, margin: 0, overflowX: 'auto',
                        fontSize: 12.5, lineHeight: 1.7, maxHeight: 500,
                    }}>
                        <code style={{
                            color: '#a5b4fc',
                            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                        }}>
                            {getCodeForGuide()}
                        </code>
                    </pre>

                    {activeGuide !== 'python' && (
                        <div style={{
                            marginTop: 12, padding: '10px 14px',
                            background: '#f0fdf4', borderRadius: 8,
                            border: '1px solid #bbf7d0',
                        }}>
                            <Text style={{ fontSize: 13, color: '#166534' }}>
                                💡 <strong>提示：</strong>
                                {activeGuide === 'cursor'
                                    ? '保存配置后，在 Cursor Chat 中直接说「搜索任务」或「帮我发布一个XX任务」即可触发 MCP 工具。'
                                    : '重启 Claude Desktop 后，AI 将自动获得发布任务、搜索任务等能力。'}
                            </Text>
                        </div>
                    )}
                </Card>
            </div>

            {/* 可用工具列表 */}
            <Card title="📦 可用 MCP 工具一览" style={{ borderRadius: 12, marginTop: 20 }} size="small">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                        { name: 'search_tasks', label: '搜索任务', desc: '按关键词、状态搜索平台任务' },
                        { name: 'publish_task', label: '发布任务', desc: '发布新的用工任务到平台' },
                        { name: 'apply_task', label: '报名任务', desc: '劳动者报名申请一个任务' },
                        { name: 'accept_application', label: '录用申请人', desc: '录用某任务的一个申请人' },
                        { name: 'submit_progress', label: '提交进度', desc: '劳动者提交工作进度更新' },
                        { name: 'approve_completion', label: '验收完成', desc: '企业验收任务完成' },
                    ].map(t => (
                        <div key={t.name} style={{
                            padding: '12px 14px', borderRadius: 8,
                            border: '1px solid #e5e7eb', background: '#fafafa',
                        }}>
                            <Tag color="purple" style={{ marginBottom: 6 }}>{t.name}</Tag>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t.label}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>{t.desc}</Text>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
