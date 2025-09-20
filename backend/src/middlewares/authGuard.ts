import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../env";

export interface AuthedRequest extends Request {
  user?: { sub: string; username: string };
}

export function authGuard(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  try {
    const token = h.slice(7);
    const payload = jwt.verify(token, ENV.JWT_SECRET) as any;
    req.user = { sub: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
