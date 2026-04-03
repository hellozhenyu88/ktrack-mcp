import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = Router();

// ─── 企业信息 ───
router.get('/enterprise', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({
        where: { userId: req.user!.userId },
    });
    if (!enterprise) { res.json({ code: 0, data: null }); return; }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { phone: true, displayName: true } });

    res.json({
        code: 0,
        data: {
            id: enterprise.id,
            companyName: enterprise.companyName,
            licenseNo: enterprise.licenseNo,
            contactPerson: enterprise.contactPerson,
            contactPhone: enterprise.contactPhone,
            address: enterprise.address,
            taxMode: enterprise.taxMode,
            status: enterprise.status,
            createdAt: enterprise.createdAt,
            phone: user?.phone,
        },
    });
});

router.put('/enterprise', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });

    const schema = z.object({
        companyName: z.string().min(1).optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        address: z.string().optional(),
        licenseNo: z.string().optional(),
        taxMode: z.enum(['individual', 'enterprise']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ code: 400, message: parsed.error.errors[0].message }); return; }

    if (enterprise) {
        const updated = await prisma.enterprise.update({ where: { id: enterprise.id }, data: parsed.data });
        res.json({ code: 0, data: updated, message: '更新成功' });
    } else {
        const created = await prisma.enterprise.create({
            data: {
                userId: req.user!.userId,
                companyName: parsed.data.companyName || '未命名企业',
                ...parsed.data,
            },
        });
        res.json({ code: 0, data: created, message: '创建成功' });
    }
});

// ─── 角色管理 ───
router.get('/roles', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.json({ code: 0, data: [] }); return; }

    const roles = await prisma.role.findMany({
        where: { enterpriseId: enterprise.id },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'asc' },
    });

    const data = roles.map(r => ({
        id: r.id,
        name: r.name,
        permissions: r.permissions,
        memberCount: r._count.members,
        createdAt: r.createdAt,
    }));
    res.json({ code: 0, data });
});

router.post('/roles', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.status(403).json({ code: 403, message: '企业不存在' }); return; }

    const schema = z.object({
        name: z.string().min(1),
        permissions: z.array(z.string()),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ code: 400, message: parsed.error.errors[0].message }); return; }

    const role = await prisma.role.create({ data: { enterpriseId: enterprise.id, ...parsed.data } });
    res.json({ code: 0, data: role, message: '创建成功' });
});

router.put('/roles/:id', async (req: Request, res: Response) => {
    const schema = z.object({ name: z.string().optional(), permissions: z.array(z.string()).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ code: 400, message: parsed.error.errors[0].message }); return; }

    const role = await prisma.role.update({ where: { id: Number(req.params.id) }, data: parsed.data });
    res.json({ code: 0, data: role, message: '更新成功' });
});

router.delete('/roles/:id', async (req: Request, res: Response) => {
    const members = await prisma.enterpriseMember.count({ where: { roleId: Number(req.params.id) } });
    if (members > 0) { res.status(400).json({ code: 400, message: '该角色下仍有成员，不能删除' }); return; }
    await prisma.role.delete({ where: { id: Number(req.params.id) } });
    res.json({ code: 0, message: '删除成功' });
});

// ─── 成员管理 ───
router.get('/members', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.json({ code: 0, data: [] }); return; }

    const members = await prisma.enterpriseMember.findMany({
        where: { enterpriseId: enterprise.id },
        orderBy: { joinedAt: 'asc' },
    });

    // Fetch user and role data separately
    const userIds = members.map(m => m.userId);
    const roleIds = [...new Set(members.map(m => m.roleId))];

    const [users, roles] = await Promise.all([
        prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true, phone: true, avatarUrl: true } }),
        prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true, name: true } }),
    ]);

    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const roleMap = Object.fromEntries(roles.map(r => [r.id, r]));

    const data = members.map(m => ({
        id: m.id,
        userId: m.userId,
        displayName: userMap[m.userId]?.displayName || userMap[m.userId]?.phone || '未知',
        phone: userMap[m.userId]?.phone,
        avatarUrl: userMap[m.userId]?.avatarUrl,
        roleName: roleMap[m.roleId]?.name || '未知角色',
        roleId: m.roleId,
        status: m.status,
        joinedAt: m.joinedAt,
    }));
    res.json({ code: 0, data });
});

router.put('/members/:id/status', async (req: Request, res: Response) => {
    const schema = z.object({ status: z.enum(['active', 'disabled']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ code: 400, message: '无效状态' }); return; }

    await prisma.enterpriseMember.update({ where: { id: Number(req.params.id) }, data: { status: parsed.data.status } });
    res.json({ code: 0, message: '更新成功' });
});

router.put('/members/:id/role', async (req: Request, res: Response) => {
    const schema = z.object({ roleId: z.number().int() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ code: 400, message: '无效角色' }); return; }

    await prisma.enterpriseMember.update({ where: { id: Number(req.params.id) }, data: { roleId: parsed.data.roleId } });
    res.json({ code: 0, message: '角色已更换' });
});

// ─── 消息中心 ───
router.get('/messages', async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 20;
    const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
    const type = req.query.type as string | undefined;

    const where: Record<string, unknown> = { receiverId: req.user!.userId };
    if (isRead !== undefined) where.isRead = isRead;
    if (type) where.type = type;

    const [total, messages] = await Promise.all([
        prisma.message.count({ where }),
        prisma.message.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    const unreadCount = await prisma.message.count({ where: { receiverId: req.user!.userId, isRead: false } });
    res.json({ code: 0, data: { data: messages, total, page, pageSize, unreadCount } });
});

router.post('/messages/read-all', async (req: Request, res: Response) => {
    await prisma.message.updateMany({ where: { receiverId: req.user!.userId, isRead: false }, data: { isRead: true } });
    res.json({ code: 0, message: '全部已读' });
});

router.put('/messages/:id/read', async (req: Request, res: Response) => {
    await prisma.message.update({ where: { id: Number(req.params.id) }, data: { isRead: true } });
    res.json({ code: 0, message: '已读' });
});

// ─── 人才管理（人才池） ───
router.get('/talent-pool', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.json({ code: 0, data: [] }); return; }

    const tag = req.query.tag as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = { enterpriseId: enterprise.id };
    if (tag) where.tag = tag;

    const pool = await prisma.talentPool.findMany({ where, orderBy: { createdAt: 'desc' } });

    // Fetch freelancer info
    const freelancerIds = pool.map(p => p.freelancerId);
    const freelancers = await prisma.user.findMany({
        where: { id: { in: freelancerIds }, ...(search ? { displayName: { contains: search } } : {}) },
        select: { id: true, displayName: true, phone: true, avatarUrl: true },
    });
    const fMap = Object.fromEntries(freelancers.map(f => [f.id, f]));

    const data = pool
        .filter(p => !search || fMap[p.freelancerId])
        .map(p => ({
            id: p.id,
            freelancerId: p.freelancerId,
            name: fMap[p.freelancerId]?.displayName || '未知',
            phone: fMap[p.freelancerId]?.phone,
            tag: p.tag,
            note: p.note,
            createdAt: p.createdAt,
        }));

    res.json({ code: 0, data });
});

// ─── 操作日志 ───
router.get('/logs', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) { res.json({ code: 0, data: { data: [], total: 0 } }); return; }

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 15;

    const orderIds = (await prisma.transactionOrder.findMany({
        where: { enterpriseId: enterprise.id },
        select: { id: true },
    })).map(o => o.id);

    const where = { orderId: { in: orderIds } };
    const [total, logs] = await Promise.all([
        prisma.transactionLog.count({ where }),
        prisma.transactionLog.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    // Fetch related data
    const operatorIds = [...new Set(logs.map(l => l.operatorId))];
    const logOrderIds = [...new Set(logs.map(l => l.orderId))];
    const [operators, orders] = await Promise.all([
        prisma.user.findMany({ where: { id: { in: operatorIds } }, select: { id: true, displayName: true, phone: true } }),
        prisma.transactionOrder.findMany({ where: { id: { in: logOrderIds } }, select: { id: true, orderNo: true } }),
    ]);
    const opMap = Object.fromEntries(operators.map(o => [o.id, o]));
    const ordMap = Object.fromEntries(orders.map(o => [o.id, o]));

    const data = logs.map(l => ({
        id: l.id,
        action: l.action,
        remark: l.remark,
        orderNo: ordMap[l.orderId]?.orderNo,
        operatorName: opMap[l.operatorId]?.displayName || opMap[l.operatorId]?.phone || '系统',
        createdAt: l.createdAt,
    }));

    res.json({ code: 0, data: { data, total, page, pageSize } });
});

/** （测试用）修改交易订单的创建日期，用于模拟跨月场景 */
router.put('/test/order-date', async (req: Request, res: Response) => {
    const { orderId, date } = req.body;
    if (!orderId || !date) {
        res.status(400).json({ code: 400, message: '需要 orderId 和 date' });
        return;
    }
    await prisma.transactionOrder.update({
        where: { id: orderId },
        data: { createdAt: new Date(date) },
    });
    res.json({ code: 0, message: '日期已更新' });
});

/** （测试用）重算某劳动者所有订单的税金（修改日期后使用） */
router.post('/test/recalc-tax', async (req: Request, res: Response) => {
    const { freelancerId } = req.body;
    if (!freelancerId) { res.status(400).json({ code: 400, message: '需要 freelancerId' }); return; }

    const { calculateLaborTax, groupOrdersByMonth } = await import('../lib/taxCalc.js');

    // 按 createdAt 升序获取所有订单
    const orders = await prisma.transactionOrder.findMany({
        where: { freelancerId, status: { in: ['pending_payment', 'escrowed', 'settled', 'completed'] } },
        orderBy: { createdAt: 'asc' },
        include: { enterprise: true },
    });

    // 逐笔重算：用已更新的前面订单作为 previousOrders
    const updatedOrders: { totalAmount: number; taxAmount: number; createdAt: Date }[] = [];
    const results = [];

    for (const order of orders) {
        const { previousOrders, currentMonthIndex } = groupOrdersByMonth(updatedOrders, order.createdAt);
        const taxMode = (order.enterprise as any)?.taxMode || 'individual';
        const taxResult = calculateLaborTax(Number(order.totalAmount), previousOrders, taxMode, { currentMonthIndex });

        // 更新数据库
        await prisma.transactionOrder.update({
            where: { id: order.id },
            data: { taxAmount: taxResult.taxAmount, netAmount: taxResult.netAmount, platformFee: taxResult.platformFee },
        });

        // 存入 updatedOrders 供后续订单参考
        updatedOrders.push({ totalAmount: Number(order.totalAmount), taxAmount: taxResult.taxAmount, createdAt: order.createdAt });
        results.push({ orderId: order.id, month: currentMonthIndex, tax: taxResult.taxAmount, net: taxResult.netAmount });
    }

    res.json({ code: 0, data: results });
});

export default router;

