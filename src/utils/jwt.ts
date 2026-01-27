import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function signToken(payload: object) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as { userId: string; iat: number; exp: number };
}
