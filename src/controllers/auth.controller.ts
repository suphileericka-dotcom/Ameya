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

  // Check existing user
  const existing = await db.query(
    `SELECT id FROM users WHERE email = $1 OR username = $2`,
    [email, username]
  );

  if (existing.rowCount && existing.rowCount > 0) {
    return res.status(409).json({ error: "Utilisateur déjà existant" });
  }

  const hashed = await hashPassword(password);
  const id = randomUUID();

  await db.query(
    `
    INSERT INTO users (id, username, email, password, city, country, situation)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      id,
      username,
      email,
      hashed,
      city ?? null,
      country ?? null,
      situation ?? null,
    ]
  );

  const token = signToken({ userId: id });

  res.status(201).json({
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

  const result = await db.query(
    `
    SELECT id, username, password
    FROM users
    WHERE email = $1 OR username = $1
    `,
    [identifier]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const user = result.rows[0];

  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const token = signToken({ userId: user.id });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  });
}
