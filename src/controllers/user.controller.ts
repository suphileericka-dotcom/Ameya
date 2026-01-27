import { Response } from "express";
import { db } from "../config/database";
import { AuthedRequest } from "../middleware/auth.middleware";

export function me(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const user = db
    .prepare(`
      SELECT id, username, email, city, country, situation, dark_mode, show_chats
      FROM users
      WHERE id = ?
    `)
    .get(userId);

  if (!user) {
    return res.status(404).json({ error: "Utilisateur introuvable" });
  }

  // Normalisation des booléens
  return res.json({
    ...user,
    dark_mode: Boolean(user.dark_mode),
    show_chats: Boolean(user.show_chats),
  });
}
