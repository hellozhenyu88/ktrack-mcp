import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { calculateLaborTax, groupOrdersByMonth } from '../lib/taxCalc.js';

const router = Router();

/** 获取任务列表（分页+筛选） */
router.get('/', async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    // 构建筛选条件
    const where: Record<string, unknown> = {};

    // 企业用户只看自己的任务
    if (req.user!.role === 'enterprise') {
        const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
        if (enterprise) where.enterpriseId = enterprise.id;
    }

    if (status) where.status = status;
    if (search) where.name = { contains: search };

    const [total, tasks] = await Promise.all([
        prisma.task.count({ where }),
        prisma.task.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    res.json({
        code: 0,
        data: {
            data: tasks,
            total,
            page,
            pageSize,
        },
    });
});

/** 获取任务详情 */
router.get('/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const task = await prisma.task.findUnique({
        where: { id },
        include: {
            applications: {
                include: {
                    freelancer: {
                        select: { id: true, displayName: true, avatarUrl: true, phone: true, bio: true, skills: true, experience: true, education: true, location: true, hourlyRate: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            },
            progressUpdates: {
                include: {
                    freelancer: {
                        select: { id: true, displayName: true, avatarUrl: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            },
        },
    });
    if (!task) {
        res.status(404).json({ code: 404, message: '任务不存在' });
        return;
    }
    res.json({ code: 0, data: task });
});

/** 创建任务 */
router.post('/', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) {
        res.status(403).json({ code: 403, message: '请先完善企业信息' });
        return;
    }

    const schema = z.object({
        name: z.string().min(1).max(200),
        type: z.string().optional(),
        description: z.string().optional(),
        requirements: z.array(z.string()).optional(),
        peopleNeeded: z.number().int().min(1).default(1),
        budget: z.number().positive(),
        duration: z.string().optional(),
        location: z.string().optional(),
        aiGenerated: z.boolean().default(false),
        aiConversationId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ code: 400, message: parsed.error.errors[0].message });
        return;
    }

    const task = await prisma.task.create({
        data: {
            ...parsed.data,
            enterpriseId: enterprise.id,
            status: 'open',
        },
    });

    res.json({ code: 0, message: '任务创建成功', data: task });
});

/** 编辑任务（仅限无人接单前可修改） */
router.put('/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await prisma.task.findUnique({ where: { id }, include: { applications: { where: { status: 'accepted' } } } });
    if (!existing) { res.status(404).json({ code: 404, message: '任务不存在' }); return; }
    if (existing.applications.length > 0) { res.status(400).json({ code: 400, message: '已有人接单，无法修改' }); return; }

    const schema = z.object({
        name: z.string().min(1).max(200).optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        requirements: z.array(z.string()).optional(),
        peopleNeeded: z.number().int().min(1).optional(),
        budget: z.number().positive().optional(),
        duration: z.string().optional(),
        location: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ code: 400, message: parsed.error.errors[0].message }); return; }

    const task = await prisma.task.update({ where: { id }, data: parsed.data });
    res.json({ code: 0, message: '任务更新成功', data: task });
});

/** 删除/取消任务 */
router.delete('/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ code: 404, message: '任务不存在' }); return; }

    try {
        // 先查关联的交易订单
        const txOrder = await prisma.transactionOrder.findUnique({ where: { taskId: id } });
        if (txOrder) {
            // 删除交易关联数据
            await prisma.transactionLog.deleteMany({ where: { orderId: txOrder.id } });
            await prisma.fundFlow.deleteMany({ where: { relatedOrderId: txOrder.id } });
            await prisma.invoice.deleteMany({ where: { orderId: txOrder.id } });
            await prisma.transactionOrder.delete({ where: { id: txOrder.id } });
        }
        // 删除消息关联
        await prisma.message.updateMany({ where: { relatedTaskId: id }, data: { relatedTaskId: null } });
        // 删除申请和进度
        await prisma.application.deleteMany({ where: { taskId: id } });
        await prisma.progressUpdate.deleteMany({ where: { taskId: id } });
        // 删除任务
        await prisma.task.delete({ where: { id } });
        res.json({ code: 0, message: '任务已删除' });
    } catch (err: any) {
        console.error('Delete task error:', err);
        res.status(500).json({ code: 500, message: '删除失败: ' + (err.message || '未知错误') });
    }
});

/** 更新任务状态 */
router.put('/:id/status', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    const task = await prisma.task.update({
        where: { id },
        data: { status },
    });

    res.json({ code: 0, message: '状态更新成功', data: task });
});

/** 确认录用申请人 */
router.put('/:id/applications/:appId/accept', async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);
    const appId = Number(req.params.appId);

    // 获取任务
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
        res.status(404).json({ code: 404, message: '任务不存在' });
        return;
    }

    // 获取申请
    const application = await prisma.application.findUnique({ where: { id: appId } });
    if (!application || application.taskId !== taskId) {
        res.status(404).json({ code: 404, message: '申请不存在' });
        return;
    }
    if (application.status !== 'pending') {
        res.status(400).json({ code: 400, message: '该申请已处理' });
        return;
    }

    // 更新申请状态
    await prisma.application.update({
        where: { id: appId },
        data: { status: 'accepted' },
    });

    // 更新任务确认人数
    const newConfirmedCount = task.confirmedCount + 1;
    const updateData: Record<string, unknown> = { confirmedCount: newConfirmedCount };

    // 如果已录用人满，自动进入执行状态
    if (newConfirmedCount >= task.peopleNeeded && task.status === 'open') {
        updateData.status = 'in_progress';
    }

    await prisma.task.update({
        where: { id: taskId },
        data: updateData,
    });

    res.json({ code: 0, message: '已确认录用' });
});

/** 拒绝申请人 */
router.put('/:id/applications/:appId/reject', async (req: Request, res: Response) => {
    const appId = Number(req.params.appId);
    await prisma.application.update({
        where: { id: appId },
        data: { status: 'rejected' },
    });
    res.json({ code: 0, message: '已拒绝' });
});

/** 企业确认验收完成 → 创建交易订单 → 进入结算 */
router.put('/:id/approve-completion', async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
        res.status(404).json({ code: 404, message: '任务不存在' });
        return;
    }
    if (task.status !== 'waiting_confirmation') {
        res.status(400).json({ code: 400, message: '任务不在待验收状态' });
        return;
    }

    // 更新任务为已完成
    await prisma.task.update({
        where: { id: taskId },
        data: { status: 'completed' },
    });

    // 获取已录用的劳动者
    const acceptedApp = await prisma.application.findFirst({
        where: { taskId, status: 'accepted' },
    });

    // 检查是否已有交易订单
    const existingOrder = await prisma.transactionOrder.findUnique({
        where: { taskId },
    });

    if (!existingOrder) {
        const totalAmount = Number(task.budget);
        const freelancerId = acceptedApp?.freelancerId || null;

        // 读取企业的增值税模式
        const enterprise = await prisma.enterprise.findUnique({ where: { id: task.enterpriseId } });
        const taxMode = (enterprise as any)?.taxMode || 'individual';

        // 查找该劳动者所有已完成的历史订单，按自然月分组用于累计预扣
        let previousOrders: { totalAmount: number; taxAmount: number; monthIndex: number }[] = [];
        let currentMonthIndex: number | undefined;
        if (freelancerId) {
            const historicalOrders = await prisma.transactionOrder.findMany({
                where: {
                    freelancerId,
                    status: { in: ['pending_payment', 'escrowed', 'settled', 'completed'] },
                },
                orderBy: { createdAt: 'asc' },
            });
            const rawOrders = historicalOrders.map(o => ({
                totalAmount: Number(o.totalAmount),
                taxAmount: Number(o.taxAmount),
                createdAt: o.createdAt,
            }));
            const grouped = groupOrdersByMonth(rawOrders, new Date());
            previousOrders = grouped.previousOrders;
            currentMonthIndex = grouped.currentMonthIndex;
        }

        // 使用累计预扣法计算税金（传入自然月序号）
        const taxResult = calculateLaborTax(totalAmount, previousOrders, taxMode, { currentMonthIndex });

        // 自动创建交易订单
        const orderNo = `TX${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const order = await prisma.transactionOrder.create({
            data: {
                orderNo,
                taskId,
                enterpriseId: task.enterpriseId,
                freelancerId,
                totalAmount: taxResult.totalAmount,
                platformFee: taxResult.platformFee,
                taxAmount: taxResult.taxAmount,
                netAmount: taxResult.netAmount,
                status: 'pending_payment',
            },
        });

        // 记录操作日志（含计算明细）
        const modeLabel = taxMode === 'enterprise' ? '企业承担' : '个人承担';
        await prisma.transactionLog.create({
            data: {
                orderId: order.id,
                action: '验收通过，创建结算订单',
                operatorId: req.user!.userId,
                remark: `任务 ${task.name} 验收通过 | 模式: ${modeLabel} | 订单: ¥${taxResult.totalAmount} | 增值税: ¥${taxResult.vatAmount} | 附加税: ¥${taxResult.surchargeTotal} | 个税: ¥${taxResult.taxAmount} | 服务费: ¥${taxResult.platformFee} | 实收: ¥${taxResult.netAmount} | 企业支出: ¥${taxResult.enterpriseCost} | 第${taxResult.monthCount}月`,
            },
        });

        res.json({
            code: 0,
            message: '验收通过，结算订单已创建',
            data: {
                orderId: order.id,
                orderNo,
                taxDetail: {
                    taxMode,
                    totalAmount: taxResult.totalAmount,
                    vatAmount: taxResult.vatAmount,
                    surchargeTotal: taxResult.surchargeTotal,
                    platformFee: taxResult.platformFee,
                    taxAmount: taxResult.taxAmount,
                    netAmount: taxResult.netAmount,
                    enterpriseCost: taxResult.enterpriseCost,
                    monthCount: taxResult.monthCount,
                },
            },
        });
    } else {
        res.json({ code: 0, message: '验收通过', data: { orderId: existingOrder.id, orderNo: existingOrder.orderNo } });
    }
});

export default router;
