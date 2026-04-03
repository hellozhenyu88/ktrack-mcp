import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

/** 控制面板统计数据 */
router.get('/stats', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });

    if (!enterprise) {
        res.json({
            code: 0,
            data: {
                stats: { activeTasks: 0, pendingSettlements: 0, totalSpent: 0, totalTalents: 0 },
                account: { balance: 0, frozenAmount: 0, totalRecharged: 0, totalSpent: 0 },
                businessOverview: { paidTotal: 0, pendingPayTotal: 0, invoiceReceivedTotal: 0, invoiceAppliedTotal: 0, paidCount: 0, totalOrderCount: 0, invoiceReceivedCount: 0, invoiceTotalCount: 0 },
                recentTasks: [],
                notifications: [],
                todos: [],
            },
        });
        return;
    }

    const [
        activeTasks,
        pendingSettlements,
        totalSpentAgg,
        totalTalents,
        recentTasks,
        account,
        paidOrders,
        pendingPayOrders,
        totalOrders,
        invoiceIssued,
        invoiceTotal,
        recentMessages,
    ] = await Promise.all([
        // 进行中任务数
        prisma.task.count({
            where: { enterpriseId: enterprise.id, status: { in: ['open', 'in_progress', 'waiting_confirmation'] } },
        }),
        // 待结算订单数
        prisma.transactionOrder.count({
            where: { enterpriseId: enterprise.id, status: { in: ['pending_acceptance', 'pending_payment'] } },
        }),
        // 累计支出
        prisma.transactionOrder.aggregate({
            where: { enterpriseId: enterprise.id, status: { in: ['settled', 'completed'] } },
            _sum: { totalAmount: true },
        }),
        // 合作人才数
        prisma.talentPool.count({ where: { enterpriseId: enterprise.id } }),
        // 最近活跃任务
        prisma.task.findMany({
            where: { enterpriseId: enterprise.id, status: { in: ['open', 'in_progress', 'waiting_confirmation'] } },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            select: { id: true, name: true, status: true, budget: true, appliedCount: true, confirmedCount: true, peopleNeeded: true },
        }),
        // 企业账户
        prisma.enterpriseAccount.findUnique({ where: { enterpriseId: enterprise.id } }),
        // 已完成支付订单
        prisma.transactionOrder.aggregate({
            where: { enterpriseId: enterprise.id, status: { in: ['settled', 'completed', 'in_progress'] } },
            _sum: { totalAmount: true },
            _count: true,
        }),
        // 待支付订单
        prisma.transactionOrder.aggregate({
            where: { enterpriseId: enterprise.id, status: { in: ['pending_payment', 'escrowed'] } },
            _sum: { totalAmount: true },
        }),
        // 总订单数
        prisma.transactionOrder.count({ where: { enterpriseId: enterprise.id } }),
        // 已开发票
        prisma.invoice.aggregate({
            where: { enterpriseId: enterprise.id, status: 'issued' },
            _sum: { amount: true },
            _count: true,
        }),
        // 总发票申请
        prisma.invoice.count({ where: { enterpriseId: enterprise.id } }),
        // 最近通知
        prisma.message.findMany({
            where: { receiverId: req.user!.userId },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { id: true, type: true, title: true, content: true, isRead: true, createdAt: true },
        }),
    ]);

    // 组装待办事项
    const todos: { title: string; link: string; count: number }[] = [];
    if (pendingSettlements > 0) todos.push({ title: '待处理结算申请', link: '/transaction', count: pendingSettlements });
    const waitingTasks = await prisma.task.count({ where: { enterpriseId: enterprise.id, status: 'waiting_confirmation' } });
    if (waitingTasks > 0) todos.push({ title: '待验收任务', link: '/tasks', count: waitingTasks });
    const draftTasks = await prisma.task.count({ where: { enterpriseId: enterprise.id, status: 'draft' } });
    if (draftTasks > 0) todos.push({ title: '草稿任务待发布', link: '/tasks', count: draftTasks });
    const pendingInvoice = await prisma.invoice.count({ where: { enterpriseId: enterprise.id, status: 'pending' } });
    if (pendingInvoice > 0) todos.push({ title: '待审核发票申请', link: '/finance/invoice-records', count: pendingInvoice });

    res.json({
        code: 0,
        data: {
            stats: {
                activeTasks,
                pendingSettlements,
                totalSpent: Number(totalSpentAgg._sum.totalAmount ?? 0),
                totalTalents,
            },
            account: account ? {
                balance: Number(account.balance),
                frozenAmount: Number(account.frozenAmount),
                totalRecharged: Number(account.totalRecharged),
                totalSpent: Number(account.totalSpent),
            } : { balance: 0, frozenAmount: 0, totalRecharged: 0, totalSpent: 0 },
            businessOverview: {
                paidTotal: Number(paidOrders._sum.totalAmount ?? 0),
                pendingPayTotal: Number(pendingPayOrders._sum.totalAmount ?? 0),
                invoiceReceivedTotal: Number(invoiceIssued._sum.amount ?? 0),
                invoiceAppliedTotal: 0,
                paidCount: paidOrders._count,
                totalOrderCount: totalOrders,
                invoiceReceivedCount: invoiceIssued._count,
                invoiceTotalCount: invoiceTotal,
            },
            recentTasks,
            notifications: recentMessages,
            todos,
        },
    });
});

export default router;
