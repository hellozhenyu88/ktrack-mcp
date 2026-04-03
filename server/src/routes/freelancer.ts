import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import prisma from '../lib/prisma.js';

const router = Router();

// 文件上传配置
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.resolve(process.cwd(), 'uploads'));
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, name);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/** 获取个人资料 */
router.get('/profile', async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { id: true, displayName: true, avatarUrl: true, phone: true, bio: true, skills: true, experience: true, education: true, location: true, hourlyRate: true },
    });
    res.json({ code: 0, data: user });
});

/** 更新个人资料 */
router.put('/profile', async (req: Request, res: Response) => {
    const schema = z.object({
        displayName: z.string().max(100).optional(),
        bio: z.string().max(1000).optional(),
        skills: z.array(z.string()).optional(),
        experience: z.string().max(2000).optional(),
        education: z.string().max(500).optional(),
        location: z.string().max(200).optional(),
        hourlyRate: z.number().positive().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ code: 400, message: parsed.error.errors[0].message });
        return;
    }
    const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: parsed.data,
        select: { id: true, displayName: true, avatarUrl: true, phone: true, bio: true, skills: true, experience: true, education: true, location: true, hourlyRate: true },
    });
    res.json({ code: 0, data: user, message: '资料更新成功' });
});

/** 浏览公开任务（无需企业身份） */
router.get('/tasks', async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
    const search = req.query.search as string | undefined;
    const type = req.query.type as string | undefined;

    const where: Record<string, unknown> = {
        status: { in: ['open', 'in_progress'] },
    };
    if (search) where.name = { contains: search };
    if (type) where.type = type;

    const [total, tasks] = await Promise.all([
        prisma.task.count({ where }),
        prisma.task.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            include: {
                enterprise: {
                    select: { companyName: true },
                },
                _count: { select: { applications: true } },
            },
        }),
    ]);

    res.json({
        code: 0,
        data: {
            data: tasks.map(t => ({
                id: t.id,
                name: t.name,
                type: t.type,
                description: t.description,
                requirements: t.requirements,
                peopleNeeded: t.peopleNeeded,
                budget: Number(t.budget),
                duration: t.duration,
                location: t.location,
                status: t.status,
                companyName: t.enterprise.companyName,
                appliedCount: t._count.applications,
                createdAt: t.createdAt.toISOString(),
            })),
            total,
            page,
            pageSize,
        },
    });
});

/** 申请任务 */
router.post('/tasks/:id/apply', async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);
    const freelancerId = req.user!.userId;

    // 检查角色
    if (req.user!.role !== 'freelancer') {
        res.status(403).json({ code: 403, message: '仅劳动者可以申请任务' });
        return;
    }

    // 检查任务存在且为 open
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.status !== 'open') {
        res.status(404).json({ code: 404, message: '任务不存在或已关闭' });
        return;
    }

    // 检查是否已申请
    const existing = await prisma.application.findUnique({
        where: { taskId_freelancerId: { taskId, freelancerId } },
    });
    if (existing) {
        res.status(400).json({ code: 400, message: '您已申请过该任务' });
        return;
    }

    const schema = z.object({
        coverLetter: z.string().optional(),
        quotedPrice: z.number().positive().optional(),
    });
    const parsed = schema.safeParse(req.body);

    const application = await prisma.application.create({
        data: {
            taskId,
            freelancerId,
            coverLetter: parsed.success ? parsed.data.coverLetter : undefined,
            quotedPrice: parsed.success && parsed.data.quotedPrice ? parsed.data.quotedPrice : undefined,
        },
    });

    // 更新申请计数
    await prisma.task.update({
        where: { id: taskId },
        data: { appliedCount: { increment: 1 } },
    });

    res.json({ code: 0, message: '申请成功', data: application });
});

/** 我的申请列表 */
router.get('/applications', async (req: Request, res: Response) => {
    const freelancerId = req.user!.userId;

    const applications = await prisma.application.findMany({
        where: { freelancerId },
        orderBy: { createdAt: 'desc' },
        include: {
            task: {
                select: {
                    id: true,
                    name: true,
                    type: true,
                    budget: true,
                    status: true,
                    duration: true,
                    enterprise: { select: { companyName: true } },
                },
            },
        },
    });

    res.json({
        code: 0,
        data: applications.map(a => ({
            id: a.id,
            status: a.status,
            coverLetter: a.coverLetter,
            quotedPrice: a.quotedPrice ? Number(a.quotedPrice) : null,
            createdAt: a.createdAt.toISOString(),
            task: {
                id: a.task.id,
                name: a.task.name,
                type: a.task.type,
                budget: Number(a.task.budget),
                status: a.task.status,
                duration: a.task.duration,
                companyName: a.task.enterprise.companyName,
            },
        })),
    });
});

/** 我的已录用任务（进行中） */
router.get('/my-tasks', async (req: Request, res: Response) => {
    const freelancerId = req.user!.userId;

    // 查找已被录用的申请对应的任务
    const applications = await prisma.application.findMany({
        where: {
            freelancerId,
            status: 'accepted',
        },
        include: {
            task: {
                include: {
                    enterprise: { select: { companyName: true } },
                    progressUpdates: {
                        where: { freelancerId },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            },
        },
    });

    res.json({
        code: 0,
        data: applications.map(a => ({
            applicationId: a.id,
            task: {
                id: a.task.id,
                name: a.task.name,
                type: a.task.type,
                budget: Number(a.task.budget),
                status: a.task.status,
                duration: a.task.duration,
                location: a.task.location,
                description: a.task.description,
                companyName: a.task.enterprise.companyName,
                progressUpdates: a.task.progressUpdates.map(p => ({
                    id: p.id,
                    content: p.content,
                    mediaUrls: p.mediaUrls,
                    wearableData: p.wearableData,
                    createdAt: p.createdAt.toISOString(),
                })),
            },
        })),
    });
});

/** 文件上传 */
router.post('/upload', upload.array('files', 10), async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
        res.status(400).json({ code: 400, message: '请选择文件' });
        return;
    }

    const urls = files.map(f => `/uploads/${f.filename}`);
    res.json({ code: 0, data: { urls } });
});

/** 提交工作进度 */
router.post('/tasks/:id/progress', async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);
    const freelancerId = req.user!.userId;

    const schema = z.object({
        content: z.string().min(1),
        mediaUrls: z.array(z.string()).optional(),
        wearableData: z.record(z.unknown()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ code: 400, message: '请输入进度内容' });
        return;
    }

    const update = await prisma.progressUpdate.create({
        data: {
            taskId,
            freelancerId,
            content: parsed.data.content,
            mediaUrls: parsed.data.mediaUrls || undefined,
            wearableData: parsed.data.wearableData || undefined,
        },
    });

    res.json({ code: 0, message: '进度已提交', data: update });
});

/** 劳动者申请结算（任务完成） */
router.post('/tasks/:id/request-settlement', async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);
    const freelancerId = req.user!.userId;

    // 检查任务存在且为 in_progress
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
        res.status(404).json({ code: 404, message: '任务不存在' });
        return;
    }
    if (task.status !== 'in_progress' && task.status !== 'open') {
        res.status(400).json({ code: 400, message: '任务状态不允许申请结算' });
        return;
    }

    // 验证是该任务的已录用劳动者
    const app = await prisma.application.findUnique({
        where: { taskId_freelancerId: { taskId, freelancerId } },
    });
    if (!app || app.status !== 'accepted') {
        res.status(403).json({ code: 403, message: '您不是该任务的已录用劳动者' });
        return;
    }

    // 更新任务状态为待验收
    await prisma.task.update({
        where: { id: taskId },
        data: { status: 'waiting_confirmation' },
    });

    // 自动添加一条进度记录
    await prisma.progressUpdate.create({
        data: {
            taskId,
            freelancerId,
            content: '劳动者已提交任务完成，申请结算',
        },
    });

    res.json({ code: 0, message: '已申请结算，等待企业审核' });
});

export default router;
