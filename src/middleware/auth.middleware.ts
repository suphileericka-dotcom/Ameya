import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export type AuthedRequest = Request & { userId?: string };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }

  const token = header.slice("Bearer ".length);
  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }
}
