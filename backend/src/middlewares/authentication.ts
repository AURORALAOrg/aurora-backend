import Jwt from "../utils/security/jwt"
import type { Request, Response, NextFunction } from "express"
import { ForbiddenError, UnauthorizedError } from "../core/api/ApiError"
import UserService from "../services/user.service"
import logger from "../core/config/logger"


export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  firstName?: string | null;
  lastName?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const requireRole = (required: 'admin' | 'user' | Array<'admin' | 'user'>) => {
  const roles = Array.isArray(required) ? required : [required];
  const allowed = new Set(roles.map(r => r.toLowerCase() as 'admin' | 'user'));
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const normalizedRole = req.user?.role?.toLowerCase() as "admin" | "user" | undefined;
    if (!normalizedRole) {
      return next(new UnauthorizedError("Unauthorized"));
    }
    if (!allowed.has(normalizedRole)) {
      return next(new ForbiddenError("Forbidden - Insufficient role"));
    }
    return next();
  };
};

// Use TokenClaims type from Jwt utility
import type { TokenClaims } from "../utils/security/jwt";

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
      let decoded: TokenClaims;
      try {
        decoded = Jwt.verify<TokenClaims>(token);
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string };
        logger.warn("JWT verification failed", { name: e?.name, message: e?.message });
        return next(
          new UnauthorizedError(
            e?.name === "TokenExpiredError" ? "Unauthorized - Token expired" : "Unauthorized - Invalid token"
          )
        );
      }

      const userId = decoded.sub ?? decoded.userId ?? decoded.id;

      if (!userId) {
        const keys = typeof decoded === 'object' && decoded ? Object.keys(decoded as Record<string, unknown>) : [];
        logger.warn("Invalid token payload (no 'sub'/'userId'/'id' claim)", { keys });
        return next(new UnauthorizedError(
          "Unauthorized - Invalid token payload: missing identifier claim ('sub'|'userId'|'id')"
        ));
      }

      // Fetch user
      const user = await UserService.readUserById(userId);
      if (!user) {
        logger.warn("User not found for id", { userId });
        return next(new UnauthorizedError("Unauthorized - User not found"));
      }

      // Attach user to request
      const authUser: AuthUser = {
        id: String(user.id),
        email: user.email,
        role: String(user.role).toLowerCase() === 'admin' ? 'admin' : 'user',
        firstName: user.firstName,
        lastName: user.lastName,
      };
      req.user = authUser;
      res.locals.accountId = user.id;
      next();
    } catch (err) {
      logger.error("Auth middleware error", {
        path: req.path,
        method: req.method,
        error: err instanceof Error ? { name: err.name, message: err.message } : String(err),
      });
      return next(new UnauthorizedError("Unauthorized"));
    }
  };
};