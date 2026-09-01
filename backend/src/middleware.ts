import { Request, Response, NextFunction } from "express";
import { verifyToken, loadSessionUser } from "./auth";
import { Role } from "./constants";
import { ApiError } from "./guard";

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (h && h.startsWith("Bearer ")) return h.slice(7);
  return null;
}

export function authRequired(roles?: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = bearer(req);
      if (!token) throw new ApiError("Not authenticated.", 401);
      const session = await verifyToken(token);
      if (!session) throw new ApiError("Session invalid or expired.", 401);
      const user = await loadSessionUser(session);
      if (!user) throw new ApiError("Account inactive or not found.", 401);
      if (roles && !roles.includes(user.role)) {
        throw new ApiError("You do not have permission to perform this action.", 403);
      }
      req.user = user;
      req.clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress;
      req.userAgent = req.headers["user-agent"];
      next();
    } catch (e) {
      next(e);
    }
  };
}
