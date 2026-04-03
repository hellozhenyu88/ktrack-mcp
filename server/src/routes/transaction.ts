import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { calculateLaborTax, groupOrdersByMonth } from '../lib/taxCalc.js';

const router = Router();

/** 交易订单列表 */
router.get('/', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) {
        res.json({ code: 0, data: { data: [], total: 0 } });
        return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = { enterpriseId: enterprise.id };
    if (status) where.status = status;

    const [total, orders] = await Promise.all([
        prisma.transactionOrder.count({ where }),
        prisma.transactionOrder.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            include: {
                task: { select: { name: true, peopleNeeded: true } },
            },
        }),
    ]);

    // 获取 freelancer 信息
    const freelancerIds = orders.map(o => o.freelancerId).filter(Boolean) as number[];
    const freelancers = freelancerIds.length > 0
        ? await prisma.user.findMany({ where: { id: { in: freelancerIds } }, select: { id: true, displayName: true, phone: true } })
        : [];
    const fMap = Object.fromEntries(freelancers.map(f => [f.id, f]));

    const data = orders.map(o => ({
        id: o.id,
        orderNo: o.orderNo,
        taskName: o.task?.name || '-',
        totalAmount: o.totalAmount,
        platformFee: o.platformFee,
        taxAmount: o.taxAmount,
        netAmount: o.netAmount,
        status: o.status,
        createdAt: o.createdAt,
        freelancerCount: o.freelancerId ? 1 : 0,
        freelancerName: o.freelancerId ? (fMap[o.freelancerId]?.displayName || fMap[o.freelancerId]?.phone || '未知') : '-',
    }));

    res.json({ code: 0, data: { data, total, page, pageSize } });
});

/** 交易订单详情（含完整项目信息闭环） */
router.get('/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const order = await prisma.transactionOrder.findUnique({
        where: { id },
        include: {
            task: true,
            logs: {
                orderBy: { createdAt: 'desc' },
                include: { operator: { select: { displayName: true } } },
            },
            fundFlows: { orderBy: { createdAt: 'desc' } },
            invoices: { orderBy: { appliedAt: 'desc' } },
        },
    });

    if (!order) {
        res.status(404).json({ code: 404, message: '订单不存在' });
        return;
    }

    // 获取企业增值税模式
    const enterprise = await prisma.enterprise.findUnique({ where: { id: order.enterpriseId } });
    const taxMode = (enterprise as any)?.taxMode || 'individual';

    // 获取 freelancer 详细信息
    let freelancerInfo = null;
    if (order.freelancerId) {
        const user = await prisma.user.findUnique({
            where: { id: order.freelancerId },
            select: { id: true, displayName: true, phone: true, avatarUrl: true, bio: true, skills: true, experience: true, education: true, location: true, hourlyRate: true },
        });
        freelancerInfo = user;
    }

    // 获取申请信息（求职信、报价）
    let applicationInfo = null;
    if (order.freelancerId && order.taskId) {
        const app = await prisma.application.findFirst({
            where: { taskId: order.taskId, freelancerId: order.freelancerId },
            select: { coverLetter: true, quotedPrice: true, createdAt: true, status: true },
        });
        applicationInfo = app;
    }

    // 获取进度记录（附件材料，含提交人信息）
    const progressUpdates = await prisma.progressUpdate.findMany({
        where: { taskId: order.taskId },
        orderBy: { createdAt: 'desc' },
        include: { freelancer: { select: { displayName: true, phone: true } } },
    });

    // 使用累计预扣法计算税费（按自然月分组）
    let previousOrders: { totalAmount: number; taxAmount: number; monthIndex: number }[] = [];
    let currentMonthIndex: number | undefined;
    if (order.freelancerId) {
        const historicalOrders = await prisma.transactionOrder.findMany({
            where: {
                freelancerId: order.freelancerId,
                status: { in: ['pending_payment', 'escrowed', 'settled', 'completed'] },
                createdAt: { lt: order.createdAt },
            },
            orderBy: { createdAt: 'asc' },
        });
        const rawOrders = historicalOrders.map(o => ({
            totalAmount: Number(o.totalAmount),
            taxAmount: Number(o.taxAmount),
            createdAt: o.createdAt,
        }));
        const grouped = groupOrdersByMonth(rawOrders, order.createdAt);
        previousOrders = grouped.previousOrders;
        currentMonthIndex = grouped.currentMonthIndex;
    }

    const taxDetail = calculateLaborTax(Number(order.totalAmount), previousOrders, taxMode, { currentMonthIndex });

    const task = order.task;

    res.json({
        code: 0,
        data: {
            // 订单基本信息
            id: order.id,
            orderNo: order.orderNo,
            totalAmount: order.totalAmount,
            platformFee: order.platformFee,
            taxAmount: order.taxAmount,
            netAmount: order.netAmount,
            status: order.status,
            contractStatus: (order as any).contractStatus || 'pending',
            signedAt: (order as any).signedAt || null,
            riskStatus: (order as any).riskStatus || 'none',
            riskReason: (order as any).riskReason || null,
            payFailReason: (order as any).payFailReason || null,
            receiptUrl: (order as any).receiptUrl || null,
            remark: (order as any).remark || null,
            paidAt: order.paidAt || null,
            settledAt: order.settledAt || null,
            createdAt: order.createdAt,
            taxMode,
            // 税费明细
            taxDetail: {
                vatAmount: taxDetail.vatAmount,
                cityTax: taxDetail.cityTax,
                eduSurcharge: taxDetail.eduSurcharge,
                localEduSurcharge: taxDetail.localEduSurcharge,
                surchargeTotal: taxDetail.surchargeTotal,
                vatAndSurcharge: taxDetail.vatAndSurcharge,
                costDeduction: taxDetail.costDeduction,
                incomeExVat: taxDetail.incomeExVat,
                enterpriseCost: taxDetail.enterpriseCost,
                monthCount: taxDetail.monthCount,
                // 重算的税金明细（基于自然月分组）
                taxAmount: taxDetail.taxAmount,
                netAmount: taxDetail.netAmount,
                platformFee: taxDetail.platformFee,
                totalAmount: taxDetail.totalAmount,
            },
            // 任务详情
            task: task ? {
                id: task.id,
                name: task.name,
                type: task.type,
                description: task.description,
                requirements: task.requirements,
                budget: task.budget,
                duration: task.duration,
                location: task.location,
                peopleNeeded: task.peopleNeeded,
                status: task.status,
                createdAt: task.createdAt,
            } : null,
            // 劳动者信息
            freelancer: freelancerInfo,
            // 申请信息
            application: applicationInfo,
            // 执行进度材料（含提交人 + 来源）
            progressUpdates: progressUpdates.map(p => ({
                id: p.id,
                content: p.content,
                mediaUrls: p.mediaUrls,
                source: (p as any).source || 'upload',
                submitter: p.freelancer?.displayName || p.freelancer?.phone || '未知',
                createdAt: p.createdAt,
            })),
            // 资金流水
            fundFlows: order.fundFlows.map(f => ({
                id: f.id,
                type: f.type,
                amount: f.amount,
                balanceAfter: f.balanceAfter,
                remark: f.remark,
                createdAt: f.createdAt,
            })),
            // 发票
            invoices: order.invoices.map(inv => ({
                id: inv.id,
                invoiceNo: inv.invoiceNo,
                amount: inv.amount,
                type: inv.type,
                title: inv.title,
                status: inv.status,
                pdfUrl: inv.pdfUrl,
                appliedAt: inv.appliedAt,
                issuedAt: inv.issuedAt,
            })),
            // 操作日志
            logs: order.logs,
        },
    });
});

/** 更新订单状态 */
router.put('/:id/status', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    const order = await prisma.transactionOrder.update({
        where: { id },
        data: { status },
    });

    // 记录操作日志
    await prisma.transactionLog.create({
        data: {
            orderId: id,
            action: `状态变更: ${status}`,
            operatorId: req.user!.userId,
            remark: `操作者将订单状态更新为 ${status}`,
        },
    });

    res.json({ code: 0, message: '状态更新成功', data: order });
});

export default router;

