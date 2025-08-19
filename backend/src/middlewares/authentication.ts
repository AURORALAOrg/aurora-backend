import Jwt from "../utils/security/jwt"
import { Request, Response, NextFunction } from "express"
import { ForbiddenError, UnauthorizedError } from "../core/api/ApiError"
import UserService from "../services/user.service"
import logger from "../core/config/logger"


interface AuthenticatedRequest extends Request {
  user?: any;
}

export const requireRole = (required: 'admin' | 'user' | Array<'admin' | 'user'>) => {
  const allowed = new Set(Array.isArray(required) ? required : [required]);
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !allowed.has(role as any)) {
      return next(new ForbiddenError('Forbidden - Insufficient role'));
    }
    return next();
  };
};

export const isAuthorized = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Extract and validate Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return next(new UnauthorizedError("Unauthorized - No token provided"));
      }

      // Robust Bearer parsing: case-insensitive, trim + collapse spaces
      const parts = authHeader.trim().split(/\s+/);
      const scheme = (parts[0] ?? "").toLowerCase();
      const token = parts[1];
      if (scheme !== "bearer" || !token) {
        return next(new UnauthorizedError("Unauthorized - Invalid token format"));
      }

      // Verify token
      let decoded: unknown;
      try {
        decoded = Jwt.verify(token);
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string };
        logger.warn("JWT verification failed", { name: e?.name, message: e?.message });
        return next(
          new UnauthorizedError(
            e?.name === "TokenExpiredError" ? "Unauthorized - Token expired" : "Unauthorized - Invalid token"
          )
        );
      }


      // Extract user ID (handle both flat and nested payload structures)
      const payload = decoded as { id?: string; payload?: { id?: string } };
      const userId = payload?.payload?.id ?? payload?.id;
      if (!userId) {
        const keys = decoded && typeof decoded === 'object'
          ? Object.keys(decoded as Record<string, unknown>)
          : [];
        logger.warn("Invalid token payload (no user id)", { keys });
        return next(new UnauthorizedError("Unauthorized - Invalid token payload"));
      }

      // Fetch user
      const user = await UserService.readUserById(userId);
      if (!user) {
        logger.warn("User not found for id", { userId });
        return next(new UnauthorizedError("Unauthorized - User not found"));
      }

      // Attach user to request
      req.user = user
      res.locals.account = user
      next()
    } catch (err) {
      logger.error('Auth middleware error', { error: err instanceof Error ? err.name : "UnknownError" });
      next(new UnauthorizedError("Unauthorized"));
    }
  };
};
