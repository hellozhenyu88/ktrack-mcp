import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

// 验证码存储（开发环境用内存，生产环境用 Redis）
const codeStore = new Map<string, { code: string; expiresAt: number }>();

/** 发送手机验证码 */
router.post('/send-code', async (req: Request, res: Response) => {
    const schema = z.object({ phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确') });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ code: 400, message: parsed.error.errors[0].message });
        return;
    }

    const { phone } = parsed.data;
    const code = '123456'; // SMS 未接入前固定验证码

    codeStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5分钟过期

    // TODO: 接入阿里云 SMS 发送真实验证码
    // if (process.env.NODE_ENV === 'production') {
    //   await sendAliyunSms(phone, code);
    // }

    console.log(`📱 验证码 [${phone}]: ${code}`);
    res.json({ code: 0, message: '验证码已发送' });
});

/** 手机号 + 验证码登录 */
router.post('/login', async (req: Request, res: Response) => {
    const schema = z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/),
        code: z.string().length(6),
        role: z.enum(['enterprise', 'freelancer']).default('enterprise'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ code: 400, message: '参数格式错误' });
        return;
    }

    const { phone, code, role } = parsed.data;

    // 验证码校验
    const stored = codeStore.get(phone);
    if (!stored || stored.code !== code || stored.expiresAt < Date.now()) {
        res.status(400).json({ code: 400, message: '验证码错误或已过期' });
        return;
    }
    codeStore.delete(phone);

    // 查找或创建用户
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                phone,
                role: role,
                displayName: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
            },
        });
    }

    // 查询关联企业
    let enterprise = await prisma.enterprise.findUnique({
        where: { userId: user.id },
    });

    // 企业角色首次登录，自动创建企业记录
    if (!enterprise && role === 'enterprise') {
        enterprise = await prisma.enterprise.create({
            data: {
                userId: user.id,
                companyName: `${phone}的企业`,
                status: 'pending',
            },
        });
    }

    // 生成 Token
    const token = signToken({ userId: user.id, phone: user.phone, role: user.role });

    res.json({
        code: 0,
        message: '登录成功',
        data: {
            token,
            user: {
                id: user.id,
                phone: user.phone,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt.toISOString(),
            },
            enterprise: enterprise
                ? {
                    id: enterprise.id,
                    userId: enterprise.userId,
                    companyName: enterprise.companyName,
                    status: enterprise.status,
                    createdAt: enterprise.createdAt.toISOString(),
                }
                : null,
        },
    });
});

/** 获取当前用户信息 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: { enterprise: true },
    });
    if (!user) {
        res.status(404).json({ code: 404, message: '用户不存在' });
        return;
    }

    res.json({
        code: 0,
        data: {
            user: {
                id: user.id,
                phone: user.phone,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt.toISOString(),
            },
            enterprise: user.enterprise
                ? {
                    id: user.enterprise.id,
                    userId: user.enterprise.userId,
                    companyName: user.enterprise.companyName,
                    status: user.enterprise.status,
                    createdAt: user.enterprise.createdAt.toISOString(),
                }
                : null,
        },
    });
});

export default router;
