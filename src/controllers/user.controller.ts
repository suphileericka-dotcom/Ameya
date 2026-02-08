import { Response } from "express";
import bcrypt from "bcrypt";
import { db } from "../config/database";
import { AuthedRequest } from "../middleware/auth.middleware";

/* =====================
   HELPERS
===================== */

function normUser(user: any) {
  return {
    id: user.id,
    username: user.username ?? "",
    email: user.email ?? "",
    city: user.city ?? null,
    country: user.country ?? null,
    situation: user.situation ?? null,
    language: user.language ?? "fr",
    dark_mode: Boolean(user.dark_mode),
    show_chats: Boolean(user.show_chats),
    avatar: user.avatar ?? null,
    created_at: user.created_at ?? null,
  };
}

/* =====================
   GET /api/user/me
===================== */
export async function me(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Non autorisé" });

  const result = await db.query(
    `
    SELECT id, username, email, city, country, situation,
           language, dark_mode, show_chats, avatar, created_at
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ error: "Utilisateur introuvable" });
  }

  return res.json(normUser(user));
}

/* =====================
   PUT /api/user/me
===================== */
export async function updateProfile(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Non autorisé" });

  const { username, email } = req.body as {
    username?: string;
    email?: string;
  };

  if (!username && !email) {
    return res.status(400).json({ error: "Aucun champ à modifier" });
  }

  if (username && username.trim().length < 2) {
    return res.status(400).json({ error: "Nom d'utilisateur trop court" });
  }

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Email invalide" });
  }

  // unicité username
  if (username) {
    const exists = await db.query(
      `SELECT 1 FROM users WHERE username = $1 AND id <> $2`,
      [username.trim(), userId]
    );
    if (exists.rowCount) {
      return res.status(409).json({ error: "Nom déjà utilisé" });
    }
  }

  // unicité email
  if (email) {
    const exists = await db.query(
      `SELECT 1 FROM users WHERE email = $1 AND id <> $2`,
      [email.trim().toLowerCase(), userId]
    );
    if (exists.rowCount) {
      return res.status(409).json({ error: "Email déjà utilisé" });
    }
  }

  await db.query(
    `
    UPDATE users
    SET
      username = COALESCE($1, username),
      email = COALESCE($2, email)
    WHERE id = $3
    `,
    [
      username ? username.trim() : null,
      email ? email.trim().toLowerCase() : null,
      userId,
    ]
  );

  const updated = await db.query(
    `
    SELECT id, username, email, city, country, situation,
           language, dark_mode, show_chats, avatar, created_at
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  return res.json(normUser(updated.rows[0]));
}

/* =====================
   PUT /api/user/me/language
===================== */
export async function updateLanguage(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Non autorisé" });

  const { language } = req.body as { language?: string };
  const allowed = new Set(["fr", "en", "es", "it", "de"]);

  if (!language || !allowed.has(language)) {
    return res.status(400).json({ error: "Langue invalide" });
  }

  await db.query(
    `UPDATE users SET language = $1 WHERE id = $2`,
    [language, userId]
  );

  return res.json({ ok: true, language });
}

/* =====================
   PUT /api/user/me/theme
===================== */
export async function updateTheme(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Non autorisé" });

  const { dark_mode } = req.body as { dark_mode?: boolean };

  if (typeof dark_mode !== "boolean") {
    return res.status(400).json({
      error: "dark_mode doit être un booléen",
    });
  }

  await db.query(
    `UPDATE users SET dark_mode = $1 WHERE id = $2`,
    [dark_mode, userId]
  );

  return res.json({ ok: true, dark_mode });
}

/* =====================
   PUT /api/user/me/password
===================== */
export async function changePassword(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Non autorisé" });

  const { oldPassword, newPassword } = req.body as {
    oldPassword?: string;
    newPassword?: string;
  };

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      error: "Mot de passe trop court (8 caractères min)",
    });
  }

  const result = await db.query(
    `SELECT password FROM users WHERE id = $1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) {
    return res.status(404).json({ error: "Utilisateur introuvable" });
  }

  const ok = await bcrypt.compare(oldPassword, row.password);
  if (!ok) {
    return res
      .status(401)
      .json({ error: "Ancien mot de passe incorrect" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await db.query(
    `UPDATE users SET password = $1 WHERE id = $2`,
    [hashed, userId]
  );

  return res.json({ ok: true });
}

/* =====================
   POST /api/user/me/avatar
===================== */
export async function uploadAvatar(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Non autorisé" });

  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }

  const publicPath = `/uploads/avatars/${req.file.filename}`;

  await db.query(
    `UPDATE users SET avatar = $1 WHERE id = $2`,
    [publicPath, userId]
  );

  return res.json({ ok: true, avatar: publicPath });
}
