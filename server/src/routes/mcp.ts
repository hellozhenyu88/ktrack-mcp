import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { generateApiKey, mcpAuthMiddleware } from '../middleware/mcpGateway.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════
// 开发者接口（公开 + API Key 认证）
// ═══════════════════════════════════════════

/** 注册应用（公开，自动审核 + 生成 API Key） */
router.post('/apps/register', async (req: Request, res: Response) => {
    const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        contactName: z.string().min(1).max(50),
        contactEmail: z.string().email().max(200),
        contactPhone: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ code: 400, message: parsed.error.errors[0].message });
        return;
    }

    // 直接创建应用并设为 approved 状态
    const app = await prisma.mcpApp.create({
        data: { ...parsed.data, status: 'approved' },
    });

    // 创建余额账户，赠送 100 次免费额度
    await prisma.mcpAppBalance.create({
        data: { appId: app.id, balance: 0, freeRemaining: 100 },
    });

    // 立即生成 API Key
    const { raw, hash, prefix } = generateApiKey();
    await prisma.mcpApiKey.create({
        data: {
            appId: app.id,
            keyHash: hash,
            keyPrefix: prefix,
            label: '默认密钥',
            rateLimit: 100,
        },
    });

    res.json({
        code: 0,
        message: '注册成功！API Key 已生成，请妥善保存。',
        data: {
            id: app.id,
            name: app.name,
            status: 'approved',
            apiKey: raw,    // ⚠️ 只返回一次明文
            keyPrefix: prefix,
            freeQuota: 100,
        },
    });
});

/** 查看我的应用信息（需 API Key） */
router.get('/apps/me', mcpAuthMiddleware, async (req: Request, res: Response) => {
    const app = await prisma.mcpApp.findUnique({
        where: { id: req.mcpApp!.appId },
        include: { balance: true },
    });
    res.json({ code: 0, data: app });
});

/** 查看我的调用统计（需 API Key） */
router.get('/apps/me/usage', mcpAuthMiddleware, async (req: Request, res: Response) => {
    const appId = req.mcpApp!.appId;
    const days = Math.min(30, Number(req.query.days) || 7);
    const since = new Date(Date.now() - days * 86400_000);

    const [totalCalls, totalBilled, recentLogs, dailyStats] = await Promise.all([
        prisma.mcpUsageLog.count({ where: { appId, createdAt: { gte: since } } }),
        prisma.mcpUsageLog.aggregate({
            where: { appId, createdAt: { gte: since } },
            _sum: { billedAmount: true },
        }),
        prisma.mcpUsageLog.findMany({
            where: { appId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { toolName: true, responseCode: true, durationMs: true, billedAmount: true, createdAt: true },
        }),
        // 按 tool 分组统计
        prisma.mcpUsageLog.groupBy({
            by: ['toolName'],
            where: { appId, createdAt: { gte: since } },
            _count: true,
            _avg: { durationMs: true },
        }),
    ]);

    res.json({
        code: 0,
        data: {
            period: `${days}天`,
            totalCalls,
            totalBilled: Number(totalBilled._sum.billedAmount ?? 0),
            byTool: dailyStats.map(s => ({
                tool: s.toolName,
                calls: s._count,
                avgDuration: Math.round(s._avg.durationMs || 0),
            })),
            recentLogs,
        },
    });
});

/** 查看余额（需 API Key） */
router.get('/apps/me/balance', mcpAuthMiddleware, async (req: Request, res: Response) => {
    const balance = await prisma.mcpAppBalance.findUnique({ where: { appId: req.mcpApp!.appId } });
    res.json({ code: 0, data: balance });
});

/** 计费明细（需 API Key） */
router.get('/apps/me/billing', mcpAuthMiddleware, async (req: Request, res: Response) => {
    const appId = req.mcpApp!.appId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 20;

    const [total, records] = await Promise.all([
        prisma.mcpBillingRecord.count({ where: { appId } }),
        prisma.mcpBillingRecord.findMany({
            where: { appId },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);

    res.json({ code: 0, data: { data: records, total, page, pageSize } });
});

/** 业务数据：通过 MCP 发布的任务和收益（需 API Key） */
router.get('/apps/me/business', mcpAuthMiddleware, async (req: Request, res: Response) => {
    const appId = req.mcpApp!.appId;

    // 获取该应用通过 MCP publish_task 创建的任务 ID
    const publishLogs = await prisma.mcpUsageLog.findMany({
        where: { appId, toolName: 'tools/call' },
        select: { requestParams: true, createdAt: true },
    });

    // 提取 publish_task 调用中的 taskId（从响应中记录）
    // 由于我们可能没有直接关联，我们查询所有任务并按时间匹配
    const tasks = await prisma.task.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
            applications: { select: { id: true, status: true } },
            enterprise: { select: { companyName: true } },
            transactionOrder: { select: { totalAmount: true, status: true } },
        },
    });

    const taskData = tasks.map((t: any) => {
        const appliedCount = t.applications?.length || 0;
        const confirmedCount = (t.applications || []).filter((a: any) => a.status === 'accepted').length;
        const order = t.transactionOrder;
        const settlement = order && (order.status === 'paid' || order.status === 'completed') ? Number(order.totalAmount) : null;

        return {
            id: t.id,
            name: t.name,
            status: t.status,
            type: t.type || '-',
            budget: Number(t.budget),
            peopleNeeded: t.peopleNeeded,
            appliedCount,
            confirmedCount,
            completedCount: settlement ? 1 : 0,
            settlement,
            createdAt: t.createdAt.toISOString(),
        };
    });

    const summary = {
        totalTasks: taskData.length,
        totalBudget: taskData.reduce((s, t) => s + t.budget, 0),
        totalApplied: taskData.reduce((s, t) => s + t.appliedCount, 0),
        completedRevenue: taskData.reduce((s, t) => s + (t.settlement || 0), 0),
    };

    res.json({ code: 0, data: { tasks: taskData, summary } });
});

// ═══════════════════════════════════════════
// 企业端接口（JWT 认证，给企业端 MCP 服务中心用）
// ═══════════════════════════════════════════

/** 企业端查看 MCP 余额 */
router.get('/enterprise/balance', authMiddleware, async (req: Request, res: Response) => {
    // MVP: 使用 appId=1（可以后续改为根据 enterpriseId 关联）
    const balance = await prisma.mcpAppBalance.findFirst({ orderBy: { id: 'asc' } });
    res.json({ code: 0, data: balance });
});

/** 企业端查看 MCP 调用记录 */
router.get('/enterprise/billing', authMiddleware, async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 20;
    // MVP: 查所有记录
    const [total, records] = await Promise.all([
        prisma.mcpBillingRecord.count(),
        prisma.mcpBillingRecord.findMany({
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);
    res.json({ code: 0, data: { data: records, total, page, pageSize } });
});

/** 企业端查看 MCP 用量统计 */
router.get('/enterprise/usage', authMiddleware, async (req: Request, res: Response) => {
    const days = Math.min(30, Number(req.query.days) || 30);
    const since = new Date(Date.now() - days * 86400_000);
    const [totalCalls, totalBilled, byTool] = await Promise.all([
        prisma.mcpUsageLog.count({ where: { createdAt: { gte: since } } }),
        prisma.mcpUsageLog.aggregate({
            where: { createdAt: { gte: since } },
            _sum: { billedAmount: true },
        }),
        prisma.mcpUsageLog.groupBy({
            by: ['toolName'],
            where: { createdAt: { gte: since } },
            _count: true,
            _avg: { durationMs: true },
        }),
    ]);
    res.json({
        code: 0,
        data: {
            totalCalls,
            totalBilled: Number(totalBilled._sum.billedAmount ?? 0),
            byTool: byTool.map(t => ({
                tool: t.toolName,
                calls: t._count,
                avgDuration: Math.round(t._avg.durationMs || 0),
            })),
        },
    });
});

// ═══════════════════════════════════════════
// 管理员接口（需 JWT + admin 角色）
// ═══════════════════════════════════════════

/** 管理员权限检查中间件 */
function adminOnly(req: Request, res: Response, next: Function) {
    if (req.user?.role !== 'admin' && req.user?.role !== 'enterprise') {
        res.status(403).json({ code: 403, message: '需要管理员权限' });
        return;
    }
    next();
}

/** 应用列表 */
router.get('/admin/apps', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const apps = await prisma.mcpApp.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            balance: true,
            _count: { select: { apiKeys: true, usageLogs: true } },
        },
    });

    res.json({
        code: 0,
        data: apps.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            contactName: a.contactName,
            contactEmail: a.contactEmail,
            status: a.status,
            balance: a.balance ? Number(a.balance.balance) : 0,
            keyCount: a._count.apiKeys,
            totalCalls: a._count.usageLogs,
            createdAt: a.createdAt,
        })),
    });
});

/** 审核通过 → 自动生成 API Key */
router.put('/admin/apps/:id/approve', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const app = await prisma.mcpApp.findUnique({ where: { id } });
    if (!app) { res.status(404).json({ code: 404, message: '应用不存在' }); return; }
    if (app.status !== 'pending') { res.status(400).json({ code: 400, message: '只能审核待审核状态的应用' }); return; }

    // 更新状态
    await prisma.mcpApp.update({ where: { id }, data: { status: 'approved' } });

    // 生成 API Key
    const { raw, hash, prefix } = generateApiKey();
    await prisma.mcpApiKey.create({
        data: {
            appId: id,
            keyHash: hash,
            keyPrefix: prefix,
            label: '默认密钥',
            rateLimit: 100,
        },
    });

    res.json({
        code: 0,
        message: '审核通过，API Key 已生成',
        data: {
            apiKey: raw, // ⚠️ 只返回一次明文，请妥善保存
            prefix,
        },
    });
});

/** 暂停应用 */
router.put('/admin/apps/:id/suspend', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await prisma.mcpApp.update({ where: { id }, data: { status: 'suspended' } });
    res.json({ code: 0, message: '应用已暂停' });
});

/** 拒绝申请 */
router.put('/admin/apps/:id/reject', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const app = await prisma.mcpApp.findUnique({ where: { id } });
    if (!app) { res.status(404).json({ code: 404, message: '应用不存在' }); return; }
    if (app.status !== 'pending') { res.status(400).json({ code: 400, message: '只能拒绝待审核状态的应用' }); return; }
    await prisma.mcpApp.update({ where: { id }, data: { status: 'rejected' } });
    res.json({ code: 0, message: '申请已拒绝' });
});

/** 恢复应用 */
router.put('/admin/apps/:id/activate', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await prisma.mcpApp.update({ where: { id }, data: { status: 'approved' } });
    res.json({ code: 0, message: '应用已恢复' });
});

/** 为应用生成新的 API Key */
router.post('/admin/apps/:id/keys', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const label = req.body.label || '新密钥';
    const rateLimit = req.body.rateLimit || 100;

    const { raw, hash, prefix } = generateApiKey();
    await prisma.mcpApiKey.create({
        data: { appId: id, keyHash: hash, keyPrefix: prefix, label, rateLimit },
    });

    res.json({
        code: 0,
        message: 'API Key 已生成',
        data: { apiKey: raw, prefix },
    });
});

/** 吊销 API Key */
router.put('/admin/keys/:id/revoke', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    await prisma.mcpApiKey.update({ where: { id: Number(req.params.id) }, data: { status: 'revoked' } });
    res.json({ code: 0, message: 'Key 已吊销' });
});

/** 全局用量统计 */
router.get('/admin/usage', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    const days = Math.min(30, Number(req.query.days) || 7);
    const since = new Date(Date.now() - days * 86400_000);

    const [totalCalls, totalBilled, byApp, byTool] = await Promise.all([
        prisma.mcpUsageLog.count({ where: { createdAt: { gte: since } } }),
        prisma.mcpUsageLog.aggregate({
            where: { createdAt: { gte: since } },
            _sum: { billedAmount: true },
        }),
        prisma.mcpUsageLog.groupBy({
            by: ['appId'],
            where: { createdAt: { gte: since } },
            _count: true,
            _sum: { billedAmount: true },
        }),
        prisma.mcpUsageLog.groupBy({
            by: ['toolName'],
            where: { createdAt: { gte: since } },
            _count: true,
            _avg: { durationMs: true },
        }),
    ]);

    // 获取应用名
    const appIds = byApp.map(a => a.appId);
    const apps = await prisma.mcpApp.findMany({
        where: { id: { in: appIds } },
        select: { id: true, name: true },
    });
    const appMap = Object.fromEntries(apps.map(a => [a.id, a.name]));

    res.json({
        code: 0,
        data: {
            period: `${days}天`,
            totalCalls,
            totalRevenue: Number(totalBilled._sum.billedAmount ?? 0),
            byApp: byApp.map(a => ({
                appId: a.appId,
                appName: appMap[a.appId] || '未知',
                calls: a._count,
                billed: Number(a._sum.billedAmount ?? 0),
            })),
            byTool: byTool.map(t => ({
                tool: t.toolName,
                calls: t._count,
                avgDuration: Math.round(t._avg.durationMs || 0),
            })),
        },
    });
});

/** 定价方案列表 */
router.get('/admin/pricing', authMiddleware, adminOnly, async (_req: Request, res: Response) => {
    const plans = await prisma.mcpPricingPlan.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ code: 0, data: plans });
});

/** 创建定价方案 */
router.post('/admin/pricing', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    const schema = z.object({
        name: z.string().min(1),
        type: z.enum(['per_call', 'monthly']),
        pricePerCall: z.number().min(0).default(0),
        monthlyPrice: z.number().min(0).default(0),
        freeQuota: z.number().int().min(0).default(0),
        description: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ code: 400, message: parsed.error.errors[0].message }); return; }

    const plan = await prisma.mcpPricingPlan.create({ data: parsed.data });
    res.json({ code: 0, data: plan, message: '定价方案已创建' });
});

/** 手动为应用充值 */
router.post('/admin/apps/:id/recharge', authMiddleware, adminOnly, async (req: Request, res: Response) => {
    const appId = Number(req.params.id);
    const { amount, remark } = req.body;
    if (!amount || amount <= 0) {
        res.status(400).json({ code: 400, message: '充值金额必须大于 0' });
        return;
    }

    const balance = await prisma.mcpAppBalance.findUnique({ where: { appId } });
    if (!balance) { res.status(404).json({ code: 404, message: '应用账户不存在' }); return; }

    const newBalance = Number(balance.balance) + amount;

    await prisma.mcpAppBalance.update({
        where: { appId },
        data: {
            balance: newBalance,
            totalRecharged: { increment: amount },
        },
    });

    await prisma.mcpBillingRecord.create({
        data: {
            appId,
            type: 'recharge',
            amount,
            balanceAfter: newBalance,
            remark: remark || `管理员充值 ¥${amount}`,
        },
    });

    res.json({ code: 0, message: `充值成功，当前余额 ¥${newBalance}` });
});

export default router;
