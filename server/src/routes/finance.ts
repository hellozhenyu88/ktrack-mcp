import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = Router();

// ─── 账户 ───
router.get('/account', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.json({ code: 0, data: null }); return; }

    const account = await prisma.enterpriseAccount.findUnique({ where: { enterpriseId: enterprise.id } });
    const escrowCount = await prisma.transactionOrder.count({ where: { enterpriseId: enterprise.id, status: 'escrowed' } });
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthSpent = await prisma.transactionOrder.aggregate({
        where: { enterpriseId: enterprise.id, status: { in: ['settled', 'completed'] }, createdAt: { gte: monthStart } },
        _sum: { totalAmount: true },
    });

    res.json({
        code: 0,
        data: {
            balance: Number(account?.balance ?? 0),
            frozenAmount: Number(account?.frozenAmount ?? 0),
            totalRecharged: Number(account?.totalRecharged ?? 0),
            totalSpent: Number(account?.totalSpent ?? 0),
            escrowCount,
            monthSpent: Number(monthSpent._sum.totalAmount ?? 0),
        },
    });
});

// ─── 资金流水 ───
router.get('/flows', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.json({ code: 0, data: { data: [], total: 0 } }); return; }

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
    const type = req.query.type as string | undefined;

    const where: Record<string, unknown> = { enterpriseId: enterprise.id };
    if (type) where.type = type;

    const [total, flows] = await Promise.all([
        prisma.fundFlow.count({ where }),
        prisma.fundFlow.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    res.json({ code: 0, data: { data: flows, total, page, pageSize } });
});

// ─── 发票配置 CRUD ───
router.get('/invoice-configs', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.json({ code: 0, data: [] }); return; }

    const configs = await prisma.invoiceConfig.findMany({ where: { enterpriseId: enterprise.id }, orderBy: { isDefault: 'desc' } });
    res.json({ code: 0, data: configs });
});

router.post('/invoice-configs', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.status(403).json({ code: 403, message: '企业不存在' }); return; }

    const schema = z.object({
        title: z.string().min(1),
        taxNo: z.string().min(1),
        bankName: z.string().optional(),
        bankAccount: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        isDefault: z.boolean().default(false),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ code: 400, message: parsed.error.errors[0].message }); return; }

    if (parsed.data.isDefault) {
        await prisma.invoiceConfig.updateMany({ where: { enterpriseId: enterprise.id }, data: { isDefault: false } });
    }

    const config = await prisma.invoiceConfig.create({ data: { enterpriseId: enterprise.id, ...parsed.data } });
    res.json({ code: 0, data: config, message: '创建成功' });
});

router.put('/invoice-configs/:id', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.status(403).json({ code: 403, message: '企业不存在' }); return; }

    if (req.body.isDefault) {
        await prisma.invoiceConfig.updateMany({ where: { enterpriseId: enterprise.id }, data: { isDefault: false } });
    }

    const config = await prisma.invoiceConfig.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json({ code: 0, data: config, message: '更新成功' });
});

router.delete('/invoice-configs/:id', async (req: Request, res: Response) => {
    await prisma.invoiceConfig.delete({ where: { id: Number(req.params.id) } });
    res.json({ code: 0, message: '删除成功' });
});

// ─── 发票申请 ───
router.post('/invoices', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.status(403).json({ code: 403, message: '企业不存在' }); return; }

    const schema = z.object({
        orderId: z.number().int().optional(),
        amount: z.number().positive(),
        type: z.enum(['ordinary', 'special']).default('ordinary'),
        configId: z.number().int(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ code: 400, message: parsed.error.errors[0].message }); return; }

    // 从配置中取开票抬头和税号
    const config = await prisma.invoiceConfig.findUnique({ where: { id: parsed.data.configId } });
    if (!config) { res.status(400).json({ code: 400, message: '开票配置不存在' }); return; }

    const invoice = await prisma.invoice.create({
        data: {
            enterpriseId: enterprise.id,
            orderId: parsed.data.orderId ?? null,
            amount: parsed.data.amount,
            type: parsed.data.type,
            title: config.title,
            taxNo: config.taxNo,
            status: 'pending',
        },
    });
    res.json({ code: 0, data: invoice, message: '申请已提交' });
});

// ─── 发票列表（申请记录） ───
router.get('/invoices', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.json({ code: 0, data: { data: [], total: 0 } }); return; }

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 10;
    const status = req.query.status as string | undefined;
    const where: Record<string, unknown> = { enterpriseId: enterprise.id };
    if (status) where.status = status;

    const [total, invoices] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { appliedAt: 'desc' },
            include: { order: { select: { orderNo: true } } },
        }),
    ]);

    const data = invoices.map(inv => ({
        ...inv,
        amount: Number(inv.amount),
        orderNo: inv.order?.orderNo || '-',
        order: undefined,
    }));
    res.json({ code: 0, data: { data, total, page, pageSize } });
});

export default router;
