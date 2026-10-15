import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

export function createAuthMiddleware(jwtSecret) {
  return function authenticate(req, _res, next) {
    const authorization = req.get("authorization");
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) {
      return next(new ApiError(401, "UNAUTHORIZED", "A valid bearer token is required."));
    }

    try {
      const payload = jwt.verify(match[1], jwtSecret, { algorithms: ["HS256"] });
      const userId = Number(payload.sub);
      if (!Number.isSafeInteger(userId) || userId < 1) throw new Error("Invalid subject");
      req.user = { id: userId };
      next();
    } catch {
      next(new ApiError(401, "UNAUTHORIZED", "The bearer token is invalid or expired."));
    }
  };
}
