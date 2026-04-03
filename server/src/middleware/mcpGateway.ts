import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';

export interface McpAuthPayload {
    appId: number;
    keyId: number;
    appName: string;
    permissions: string[] | null;
}

// 扩展 Express Request
declare global {
    namespace Express {
        interface Request {
            mcpApp?: McpAuthPayload;
        }
    }
}

// 内存速率限制窗口: keyId -> { count, windowStart }
const rateLimitWindows = new Map<number, { count: number; windowStart: number }>();

/** 生成 API Key */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
    const raw = `kt_live_${crypto.randomBytes(24).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const prefix = raw.slice(0, 12);
    return { raw, hash, prefix };
}

/** 哈希 API Key */
export function hashApiKey(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
}

/** MCP API Key 认证中间件 */
export async function mcpAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer kt_')) {
        res.status(401).json({ code: 401, message: '缺少有效的 API Key' });
        return;
    }

    const rawKey = authHeader.slice(7);
    const keyHash = hashApiKey(rawKey);

    try {
        const apiKey = await prisma.mcpApiKey.findUnique({
            where: { keyHash },
            include: { app: true },
        });

        if (!apiKey) {
            res.status(401).json({ code: 401, message: 'API Key 无效' });
            return;
        }

        if (apiKey.status !== 'active') {
            res.status(401).json({ code: 401, message: `API Key 已${apiKey.status === 'revoked' ? '吊销' : '过期'}` });
            return;
        }

        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            res.status(401).json({ code: 401, message: 'API Key 已过期' });
            return;
        }

        if (apiKey.app.status !== 'approved') {
            res.status(403).json({ code: 403, message: `应用状态: ${apiKey.app.status}，无法调用` });
            return;
        }

        // 速率限制检查
        const now = Date.now();
        const windowMs = 60_000; // 1 分钟
        const window = rateLimitWindows.get(apiKey.id);

        if (window && (now - window.windowStart) < windowMs) {
            if (window.count >= apiKey.rateLimit) {
                res.status(429).json({
                    code: 429,
                    message: '调用频率超限',
                    limit: apiKey.rateLimit,
                    retryAfter: Math.ceil((windowMs - (now - window.windowStart)) / 1000),
                });
                return;
            }
            window.count++;
        } else {
            rateLimitWindows.set(apiKey.id, { count: 1, windowStart: now });
        }

        // 更新最后使用时间（异步，不阻塞）
        prisma.mcpApiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
        }).catch(() => { /* 忽略错误 */ });

        // 注入认证信息
        req.mcpApp = {
            appId: apiKey.appId,
            keyId: apiKey.id,
            appName: apiKey.app.name,
            permissions: apiKey.permissions as string[] | null,
        };

        next();
    } catch (err) {
        console.error('MCP Auth error:', err);
        res.status(500).json({ code: 500, message: '认证服务异常' });
    }
}

/** 用量记录工具函数（异步，不阻塞响应） */
export function logMcpUsage(params: {
    appId: number;
    keyId: number;
    toolName: string;
    requestParams?: unknown;
    responseCode: number;
    durationMs: number;
    billedAmount?: number;
}) {
    prisma.mcpUsageLog.create({
        data: {
            appId: params.appId,
            keyId: params.keyId,
            toolName: params.toolName,
            requestParams: params.requestParams ? JSON.parse(JSON.stringify(params.requestParams)) : undefined,
            responseCode: params.responseCode,
            durationMs: params.durationMs,
            billedAmount: params.billedAmount || 0,
        },
    }).catch((err) => {
        console.error('MCP usage log error:', err);
    });
}
