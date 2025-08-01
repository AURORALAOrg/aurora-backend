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
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new UnauthorizedError("Unauthorized - No token provided"))
      }

      const token = authHeader.split(" ")[1]
      const decoded = Jwt.verify(token)

      if (!decoded || !decoded.payload || !decoded.payload.id) {
        return next(new UnauthorizedError("Unauthorized - Invalid token"))
      }

      const user = await UserService.readUserById(decoded.payload.id)
      if (!user) return next(new UnauthorizedError("Unauthorized - User not found"))

      req.user = user
      res.locals.account = user
      next()
    } catch (err) {
      logger.error('Auth middleware error', { error: err instanceof Error ? err.message : String(err) });
      next(new UnauthorizedError("Unauthorized"))
    }
  }
}
