import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthTokenPayload {
  sub: number;
  type: "access" | "refresh";
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as unknown as AuthTokenPayload;

    if (payload.type !== "access") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
