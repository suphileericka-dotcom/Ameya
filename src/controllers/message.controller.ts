import { Request, Response } from "express";
import { db } from "../config/database";
import { randomUUID } from "crypto";

import multer from "multer";
import path from "path";
import fs from "fs";

/* =====================
   TYPES
===================== */

type MessageRow = {
  id: string;
  room: string;
  user_id: string;
  content: string | null;
  audio_path: string | null;
  created_at: Date;
  edited_at: Date | null;
};

type AudioRow = {
  audio_path: string;
};

type UploadedAudioFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

type MulterRequest = Request & {
  file?: UploadedAudioFile;
};

/* =====================
   CONFIG
===================== */

const ROOM_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const uploadDir = path.join(__dirname, "../../uploads/audio");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =====================
   MULTER
===================== */

const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ): void => {
    cb(null, uploadDir);
  },

  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ): void => {
    const ext = path.extname(file.originalname || ".webm");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const upload = multer({ storage });

/* =====================
   HELPERS
===================== */

function now(): Date {
  return new Date();
}

/**
 * Purge messages & audios older than 24h
 * ⚠️ simple version (OK en V1, cron plus tard)
 */
async function purgeOldMessages(): Promise<void> {
  const limit = new Date(Date.now() - ROOM_TTL_MS);

  const oldAudios = await db.query<AudioRow>(
    `
    SELECT audio_path
    FROM messages
    WHERE created_at < $1 AND audio_path IS NOT NULL
    `,
    [limit]
  );

  for (const a of oldAudios.rows) {
    const full = path.join(uploadDir, a.audio_path);
    try {
      fs.unlinkSync(full);
    } catch {
      /* ignore */
    }
  }

  await db.query(`DELETE FROM messages WHERE created_at < $1`, [limit]);
}

/* =====================
   GET /api/messages?room=burnout
===================== */

export async function getMessages(req: Request, res: Response) {
  const room = req.query.room as string;
  if (!room) return res.status(400).json({ error: "Room manquante" });

  await purgeOldMessages();

  const limit = new Date(Date.now() - ROOM_TTL_MS);

  const result = await db.query<MessageRow>(
    `
    SELECT id, room, user_id, content, audio_path, created_at, edited_at
    FROM messages
    WHERE room = $1 AND created_at >= $2
    ORDER BY created_at ASC
    `,
    [room, limit]
  );

  const messages = result.rows.map((m: MessageRow) => ({
    id: m.id,
    room: m.room,
    userId: m.user_id,
    content: m.content,
    audioUrl: m.audio_path ? `/uploads/audio/${m.audio_path}` : null,
    createdAt: m.created_at,
    editedAt: m.edited_at ?? null,
  }));

  res.json(messages);
}

/* =====================
   POST /api/messages (texte)
===================== */

export async function postMessage(req: Request, res: Response) {
  const { room, userId, content } = req.body as {
    room?: string;
    userId?: string;
    content?: string;
  };

  if (!room || !userId || !content?.trim()) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  await purgeOldMessages();

  const id = randomUUID();

  await db.query(
    `
    INSERT INTO messages (id, room, user_id, content)
    VALUES ($1, $2, $3, $4)
    `,
    [id, room, userId, content.trim()]
  );

  res.json({
    id,
    room,
    userId,
    content: content.trim(),
    audioUrl: null,
    createdAt: now(),
    editedAt: null,
  });
}

/* =====================
   PUT /api/messages/:id
===================== */

export async function updateMessage(req: Request, res: Response) {
  const { id } = req.params;
  const { userId, content } = req.body as {
    userId?: string;
    content?: string;
  };

  if (!userId || !content?.trim()) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  const result = await db.query<{ user_id: string; created_at: Date }>(
    `
    SELECT user_id, created_at
    FROM messages
    WHERE id = $1
    `,
    [id]
  );

  const row = result.rows[0];
  if (!row) return res.status(404).json({ error: "Message introuvable" });
  if (row.user_id !== userId) {
    return res.status(403).json({ error: "Action interdite" });
  }

  if (Date.now() - row.created_at.getTime() > ROOM_TTL_MS) {
    return res.status(403).json({ error: "Message expiré (24h)" });
  }

  const editedAt = now();

  await db.query(
    `
    UPDATE messages
    SET content = $1, edited_at = $2
    WHERE id = $3
    `,
    [content.trim(), editedAt, id]
  );

  res.json({ success: true, editedAt });
}

/* =====================
   DELETE /api/messages/:id
===================== */

export async function deleteMessage(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.query.userId as string | undefined;

  if (!userId) {
    return res.status(400).json({ error: "userId manquant" });
  }

  const result = await db.query<{ user_id: string; audio_path: string | null }>(
    `
    SELECT user_id, audio_path
    FROM messages
    WHERE id = $1
    `,
    [id]
  );

  const row = result.rows[0];
  if (!row) return res.status(404).json({ error: "Message introuvable" });
  if (row.user_id !== userId) {
    return res.status(403).json({ error: "Action interdite" });
  }

  if (row.audio_path) {
    const full = path.join(uploadDir, row.audio_path);
    try {
      fs.unlinkSync(full);
    } catch {
      /* ignore */
    }
  }

  await db.query(`DELETE FROM messages WHERE id = $1`, [id]);
  res.json({ success: true });
}

/* =====================
   POST /api/messages/audio
===================== */

export const uploadAudio = [
  upload.single("audio"),
  async (req: MulterRequest, res: Response) => {
    const { room, userId } = req.body as {
      room?: string;
      userId?: string;
    };

    if (!room || !userId || !req.file?.filename) {
      return res.status(400).json({ error: "Données manquantes" });
    }

    await purgeOldMessages();

    const id = randomUUID();

    await db.query(
      `
      INSERT INTO messages (id, room, user_id, audio_path)
      VALUES ($1, $2, $3, $4)
      `,
      [id, room, userId, req.file.filename]
    );

    res.json({
      id,
      room,
      userId,
      content: null,
      audioUrl: `/uploads/audio/${req.file.filename}`,
      createdAt: now(),
      editedAt: null,
    });
  },
];
