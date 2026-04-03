import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import taskRouter from './routes/tasks.js';
import dashboardRouter from './routes/dashboard.js';
import aiRouter from './routes/ai.js';
import talentRouter from './routes/talent.js';
import transactionRouter from './routes/transaction.js';
import financeRouter from './routes/finance.js';
import systemRouter from './routes/system.js';
import freelancerRouter from './routes/freelancer.js';
import mcpRouter from './routes/mcp.js';
import { authMiddleware } from './middleware/auth.js';
import { mcpAuthMiddleware } from './middleware/mcpGateway.js';
import { handleMcpPost, handleMcpGet, handleMcpDelete } from './mcp/mcpServer.js';
import prisma from './lib/prisma.js';
import fs from 'fs';

const app = express();
const PORT = Number(process.env.PORT) || 3200;

// 确保 uploads 目录存在
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// 中间件
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

// 劳动者端 H5 页面（本地开发用）
app.get('/freelancer', (_req, res) => {
    res.sendFile(path.resolve(process.cwd(), '..', 'freelancer-app.html'));
});

// 健康检查
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 公开路由
app.use('/api/auth', authRouter);

// 公开任务广场（freelancer端无需登录即可浏览）
app.get('/api/public/tasks', async (_req, res) => {
    const tasks = await prisma.task.findMany({
        where: { status: { in: ['open', 'in_progress'] } },
        include: { enterprise: { select: { companyName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    res.json({ code: 0, data: tasks });
});

// 公开任务详情（单个任务，无需登录）
app.get('/api/public/tasks/:id', async (req, res) => {
    const id = Number(req.params.id);
    const task = await prisma.task.findUnique({
        where: { id },
        include: { enterprise: { select: { companyName: true } } },
    });
    if (!task) { res.status(404).json({ code: 404, message: '任务不存在' }); return; }
    res.json({ code: 0, data: task });
});

// 需认证的路由
app.use('/api/tasks', authMiddleware, taskRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/ai', authMiddleware, aiRouter);
app.use('/api/talent', authMiddleware, talentRouter);
app.use('/api/transactions', authMiddleware, transactionRouter);
app.use('/api/finance', authMiddleware, financeRouter);
app.use('/api/system', authMiddleware, systemRouter);
app.use('/api/freelancer', authMiddleware, freelancerRouter);

// MCP 管理 API
app.use('/api/mcp', mcpRouter);

// MCP Streamable HTTP 端点（需 API Key 认证）
app.post('/mcp', mcpAuthMiddleware, handleMcpPost);
app.get('/mcp', mcpAuthMiddleware, handleMcpGet);
app.delete('/mcp', mcpAuthMiddleware, handleMcpDelete);

// 全局错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({ code: 500, message: err.message || '服务器内部错误' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 K-Track API 服务运行在 http://localhost:${PORT}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`🔌 MCP 端点: http://localhost:${PORT}/mcp`);
    console.log(`📋 MCP 管理: http://localhost:${PORT}/api/mcp`);
});

export default app;

