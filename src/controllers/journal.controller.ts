import { Request, Response } from "express";
import { db } from "../config/database";
import { randomUUID } from "crypto";

/**
 * GET /api/journal
 * → retourne toutes les entrées de l'utilisateur
 */
export function getJournal(req: Request, res: Response) {
  const userId = (req as any).userId;

  const entries = db
    .prepare(
      `SELECT id, text, created_at
       FROM journal_entries
       WHERE user_id = ?
       ORDER BY created_at ASC`
    )
    .all(userId);

  res.json(entries);
}

/**
 * POST /api/journal
 * → ajoute une nouvelle entrée
 */
export function addJournalEntry(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { text } = req.body;

  if (!text || text.trim().length < 3) {
    return res.status(400).json({ error: "Texte trop court" });
  }

  const entry = {
    id: randomUUID(),
    user_id: userId,
    text: text.trim(),
    created_at: Date.now(),
  };

  db.prepare(
    `INSERT INTO journal_entries (id, user_id, text, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(
    entry.id,
    entry.user_id,
    entry.text,
    entry.created_at
  );

  res.json(entry);
}
