import { Request, Response, NextFunction } from "express";
import { SessionUser } from "./auth";
import { Role, Roles } from "./constants";

// Express request augmentation
declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      clientIp?: string;
      userAgent?: string;
    }
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.name === "ZodError") {
    return res.status(400).json({ error: err.issues?.[0]?.message ?? "Invalid input." });
  }
  if (err?.name === "PrismaClientInitializationError" || err?.name === "PrismaClientKnownRequestError" || err?.name === "PrismaClientUnknownRequestError" || err?.code === "P1001" || err?.code === "P1000") {
    console.error("DB ERROR:", err.message);
    return res.status(500).json({ error: `DB_ERROR: ${err.message} (${err.code ?? ""})` });
  }
  console.error("UNHANDLED ERROR:", err);
  return res.status(500).json({ error: `ERR_DEBUG: ${err?.name}: ${err?.message}` });
}

// Wrap an async route handler to forward errors.
export function asyncH(
  fn: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}
