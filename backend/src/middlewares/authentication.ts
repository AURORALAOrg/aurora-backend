import Jwt from "../utils/security/jwt"
import { Request, Response, NextFunction } from "express"
import { UnauthorizedError } from "../core/api/ApiError"
import UserService from "../services/user.service"
import logger from "../core/config/logger"


interface AuthenticatedRequest extends Request {
  user?: any;
}

export const isAuthorized = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Extract and validate Authorization header
      const authHeader = req.headers.authorization;
      console.log("🔍 Authorization Header:", authHeader); // Debug log
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new UnauthorizedError("Unauthorized - No token provided"));
      }

      // Extract token
      const token = authHeader.split(" ")[1];
      console.log("🔍 Token:", token); // Debug log
      if (!token) {
        return next(new UnauthorizedError("Unauthorized - Invalid token format"));
      }

      // Verify token
      let decoded: any;
      try {
        decoded = Jwt.verify(token);
        console.log("🔍 Decoded token:", JSON.stringify(decoded, null, 2)); // Debug log
      } catch (err: any) {
        console.error("❌ JWT verification error:", err.name, err.message);
        if (err.name === "TokenExpiredError") {
          return next(new UnauthorizedError("Unauthorized - Token expired"));
        }
        return next(new UnauthorizedError("Unauthorized - Invalid token"));
      }


      // Extract user ID (handle both flat and nested payload structures)
      const userId = decoded.payload?.id || decoded.id;
      if (!userId) {
        logger.warn("Invalid token payload (no user id)", { decoded: typeof decoded === "object" ? decoded : String(decoded) });
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