import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = Router();

/** 人才列表（平台公开人才 + 企业私有人才池） */
router.get('/', async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 12));
    const search = req.query.search as string | undefined;
    const skill = req.query.skill as string | undefined;
    const location = req.query.location as string | undefined;

    // 查询所有 freelancer 角色用户
    const where: Record<string, unknown> = { role: 'freelancer', status: 'active' };
    if (search) {
        where.OR = [
            { displayName: { contains: search } },
            { phone: { contains: search } },
        ];
    }

    const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                phone: true,
                createdAt: true,
            },
        }),
    ]);

    res.json({
        code: 0,
        data: { data: users, total, page, pageSize },
    });
});

/** 企业人才池 */
router.get('/pool', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) {
        res.json({ code: 0, data: { data: [], total: 0 } });
        return;
    }

    const tag = req.query.tag as string | undefined;
    const where: Record<string, unknown> = { enterpriseId: enterprise.id };
    if (tag) where.tag = tag;

    const [total, pool] = await Promise.all([
        prisma.talentPool.count({ where }),
        prisma.talentPool.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    res.json({ code: 0, data: { data: pool, total } });
});

/** 添加到人才池 */
router.post('/pool', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) {
        res.status(403).json({ code: 403, message: '请先完善企业信息' });
        return;
    }

    const schema = z.object({
        freelancerId: z.number().int(),
        tag: z.enum(['favorite', 'blacklisted', 'cooperated']).default('favorite'),
        note: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ code: 400, message: parsed.error.errors[0].message });
        return;
    }

    const item = await prisma.talentPool.upsert({
        where: { enterpriseId_freelancerId: { enterpriseId: enterprise.id, freelancerId: parsed.data.freelancerId } },
        update: { tag: parsed.data.tag, note: parsed.data.note },
        create: { enterpriseId: enterprise.id, ...parsed.data },
    });

    res.json({ code: 0, message: '操作成功', data: item });
});

/** 从人才池移除 */
router.delete('/pool/:freelancerId', async (req: Request, res: Response) => {
    const enterprise = await prisma.enterprise.findUnique({ where: { userId: req.user!.userId } });
    if (!enterprise) {
        res.status(403).json({ code: 403, message: '请先完善企业信息' });
        return;
    }

    await prisma.talentPool.deleteMany({
        where: { enterpriseId: enterprise.id, freelancerId: Number(req.params.freelancerId) },
    });

    res.json({ code: 0, message: '已移除' });
});

export default router;
