import { Request, Response } from "express";
import { db } from "../config/database";
import { randomUUID } from "crypto";

/**
 * GET /api/messages?room=burnout
 */
export function getMessages(req: Request, res: Response) {
  const room = req.query.room as string;

  if (!room) {
    return res.status(400).json({ error: "Room manquante" });
  }

  const messages = db
    .prepare(
      `SELECT id, content, created_at
       FROM messages
       WHERE room = ?
       ORDER BY created_at ASC`
    )
    .all(room);

  res.json(messages);
}

/**
 * POST /api/messages
 */
export function postMessage(req: Request, res: Response) {
  const { room, userId, content } = req.body;

  if (!room || !userId || !content) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const message = {
    id: randomUUID(),
    room,
    user_id: userId,
    content,
    created_at: Date.now(),
  };

  db.prepare(
    `INSERT INTO messages (id, room, user_id, content, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    message.id,
    message.room,
    message.user_id,
    message.content,
    message.created_at
  );

  res.json(message);
}
