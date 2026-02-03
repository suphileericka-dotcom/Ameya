import { Response } from "express";
import bcrypt from "bcrypt";
import { db } from "../config/database";
import { AuthedRequest } from "../middleware/auth.middleware";

/**
 * Normalisation user (SQLite → frontend)
 */
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

/**
 * =====================
 * GET /api/user/me
 * =====================
 */
export function me(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Non autorisé" });

  const user = db
    .prepare(`
      SELECT id, username, email, city, country, situation,
             language, dark_mode, show_chats, avatar, created_at
      FROM users
      WHERE id = ?
    `)
    .get(userId);

  if (!user) {
    return res.status(404).json({ error: "Utilisateur introuvable" });
  }

  return res.json(normUser(user));
}

/**
 * =====================
 * PUT /api/user/me
 * body: { username?, email? }
 * =====================
 */
export function updateProfile(req: AuthedRequest, res: Response) {
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
    const exists = db
      .prepare(`SELECT id FROM users WHERE username = ? AND id != ?`)
      .get(username.trim(), userId);
    if (exists) {
      return res.status(409).json({ error: "Nom déjà utilisé" });
    }
  }

  // unicité email
  if (email) {
    const exists = db
      .prepare(`SELECT id FROM users WHERE email = ? AND id != ?`)
      .get(email.trim().toLowerCase(), userId);
    if (exists) {
      return res.status(409).json({ error: "Email déjà utilisé" });
    }
  }

  db.prepare(`
    UPDATE users
    SET
      username = COALESCE(?, username),
      email = COALESCE(?, email)
    WHERE id = ?
  `).run(
    username ? username.trim() : null,
    email ? email.trim().toLowerCase() : null,
    userId
  );

  const updated = db
    .prepare(`
      SELECT id, username, email, city, country, situation,
             language, dark_mode, show_chats, avatar, created_at
      FROM users WHERE id = ?
    `)
    .get(userId);

  return res.json(normUser(updated));
}

/**
 * =====================
 * PUT /api/user/me/language
 * body: { language }
 * =====================
 */
export function updateLanguage(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Non autorisé" });

  const { language } = req.body as { language?: string };
  const allowed = new Set(["fr", "en", "es", "it", "de"]);

  if (!language || !allowed.has(language)) {
    return res.status(400).json({ error: "Langue invalide" });
  }

  db.prepare(`UPDATE users SET language = ? WHERE id = ?`).run(
    language,
    userId
  );

  return res.json({ ok: true, language });
}

/**
 * =====================
 * PUT /api/user/me/theme
 * body: { dark_mode }
 * =====================
 */
export function updateTheme(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Non autorisé" });

  const { dark_mode } = req.body as { dark_mode?: boolean };

  if (typeof dark_mode !== "boolean") {
    return res
      .status(400)
      .json({ error: "dark_mode doit être un booléen" });
  }

  db.prepare(`UPDATE users SET dark_mode = ? WHERE id = ?`).run(
    dark_mode ? 1 : 0,
    userId
  );

  return res.json({ ok: true, dark_mode });
}

/**
 * =====================
 * PUT /api/user/me/password
 * body: { oldPassword, newPassword }
 * =====================
 */
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
    return res
      .status(400)
      .json({ error: "Mot de passe trop court (8 caractères min)" });
  }

  const row = db
    .prepare(`SELECT password FROM users WHERE id = ?`)
    .get(userId);

  if (!row) {
    return res.status(404).json({ error: "Utilisateur introuvable" });
  }

  const ok = await bcrypt.compare(oldPassword, row.password);
  if (!ok) {
    return res.status(401).json({ error: "Ancien mot de passe incorrect" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(
    hashed,
    userId
  );

  return res.json({ ok: true });
}

/**
 * =====================
 * POST /api/user/me/avatar
 * multipart/form-data (field "avatar")
 * =====================
 */
export function uploadAvatar(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Non autorisé" });

  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }

  // chemin public exposé par express.static("/uploads")
  const publicPath = `/uploads/avatars/${req.file.filename}`;

  db.prepare(`UPDATE users SET avatar = ? WHERE id = ?`).run(
    publicPath,
    userId
  );

  return res.json({ ok: true, avatar: publicPath });
}
