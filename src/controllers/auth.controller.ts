import { Request, Response } from "express";
import { db } from "../config/database";
import { hashPassword, verifyPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { randomUUID } from "crypto";

/* =====================
   REGISTER
===================== */
export async function register(req: Request, res: Response) {
  const { username, email, password, city, country, situation } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ? OR username = ?")
    .get(email, username);

  if (existing) {
    return res.status(409).json({ error: "Utilisateur déjà existant" });
  }

  const hashed = await hashPassword(password);
  const id = randomUUID();

  db.prepare(`
    INSERT INTO users (id, username, email, password, city, country, situation, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    username,
    email,
    hashed,
    city ?? null,
    country ?? null,
    situation ?? null,
    Date.now()
  );

  const token = signToken({ userId: id });

  res.json({
    token,
    user: { id, username },
  });
}

/* =====================
   LOGIN
===================== */
export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE email = ? OR username = ?")
    .get(identifier, identifier) as {
      id: string;
      username: string;
      password: string;
    } | undefined;

  if (!user) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const ok = await verifyPassword(password, user.password);

  
  if (!ok) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const token = signToken({ userId: user.id });

  const userId = req.userId;

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  });
}

