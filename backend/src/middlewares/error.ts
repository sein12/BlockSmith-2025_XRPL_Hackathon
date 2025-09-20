import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const code = err.status || 500;
  const msg =
    process.env.NODE_ENV === "production" && code === 500
      ? "Internal server error"
      : err.message || "Error";
  if (code >= 500) console.error(err);
  res.status(code).json({ error: msg });
}
