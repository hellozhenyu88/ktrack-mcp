import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

export interface AuthPayload {
    userId: number;
    phone: string;
    role: string;
}

// 扩展 Express Request 类型
declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}

/** JWT 认证中间件 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ code: 401, message: '未登录或 Token 无效' });
        return;
    }

    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ code: 401, message: 'Token 已过期，请重新登录' });
    }
}

/** 生成 JWT Token */
export function signToken(payload: AuthPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
}
