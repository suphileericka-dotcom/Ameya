import { Request, Response } from "express";
import { db } from "../config/database";
import { randomUUID } from "crypto";

import multer from "multer";
import path from "path";
import fs from "fs";

// =====================
// CONFIG
// =====================

const ROOM_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const uploadDir = path.join(__dirname, "../../uploads/audio");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Type minimal (propre) pour éviter Express.Multer.File et multer.File
type UploadedAudioFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

type MulterRequest = Request & {
  file?: UploadedAudioFile;
};

const storage = multer.diskStorage({
  destination: (
    _req: Express.Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, uploadDir);
  },
  filename: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const ext = path.extname(file.originalname || ".webm");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const upload = multer({ storage });

// =====================
// HELPERS
// =====================

function now() {
  return Date.now();
}

function purgeOldMessages() {
  const limit = now() - ROOM_TTL_MS;

  // Supprime aussi les fichiers audio associés
  const oldAudios = db
    .prepare(`SELECT audio_path FROM messages WHERE created_at < ? AND audio_path IS NOT NULL`)
    .all(limit) as { audio_path: string }[];

  for (const a of oldAudios) {
    const full = path.join(uploadDir, a.audio_path);
    try {
      fs.unlinkSync(full);
    } catch {}
  }

  db.prepare(`DELETE FROM messages WHERE created_at < ?`).run(limit);
}

// =====================
// GET /api/messages?room=burnout
// =====================

export function getMessages(req: Request, res: Response) {
  const room = req.query.room as string;
  if (!room) return res.status(400).json({ error: "Room manquante" });

  // purge 24h avant de renvoyer (simple, efficace)
  purgeOldMessages();

  const limit = now() - ROOM_TTL_MS;

  const rows = db
    .prepare(
      `SELECT id, room, user_id, content, audio_path, created_at, edited_at
       FROM messages
       WHERE room = ? AND created_at >= ?
       ORDER BY created_at ASC`
    )
    .all(room, limit) as any[];

  // Format UNIQUE pour le front (camelCase partout)
  const messages = rows.map((m) => ({
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

// =====================
// POST /api/messages (texte)
// =====================

export function postMessage(req: Request, res: Response) {
  const { room, userId, content } = req.body as {
    room?: string;
    userId?: string;
    content?: string;
  };

  if (!room || !userId || !content?.trim()) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  purgeOldMessages();

  const id = randomUUID();
  const createdAt = now();

  db.prepare(
    `INSERT INTO messages (id, room, user_id, content, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, room, userId, content.trim(), createdAt);

  res.json({
    id,
    room,
    userId,
    content: content.trim(),
    audioUrl: null,
    createdAt,
    editedAt: null,
  });
}

// =====================
// PUT /api/messages/:id (sécurisé)
// =====================

export function updateMessage(req: Request, res: Response) {
  const { id } = req.params;
  const { userId, content } = req.body as { userId?: string; content?: string };

  if (!userId || !content?.trim()) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  
  const row = db
    .prepare(`SELECT user_id, created_at FROM messages WHERE id = ?`)
    .get(id) as { user_id: string; created_at: number } | undefined;

  if (!row) return res.status(404).json({ error: "Message introuvable" });
  if (row.user_id !== userId) return res.status(403).json({ error: "Action interdite" });

  // option : empêcher modif au-delà de 24h (cohérent)
  if (now() - row.created_at > ROOM_TTL_MS) {
    return res.status(403).json({ error: "Message expiré (24h)" });
  }

  const editedAt = now();

  db.prepare(`UPDATE messages SET content = ?, edited_at = ? WHERE id = ?`)
    .run(content.trim(), editedAt, id);

  res.json({ success: true, editedAt });
}

// =====================
// DELETE /api/messages/:id?userId=xxx (sécurisé)
// =====================

export function deleteMessage(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.query.userId as string | undefined;

  if (!userId) {
    return res.status(400).json({ error: "userId manquant" });
  }

  const row = db
    .prepare(`SELECT user_id, audio_path FROM messages WHERE id = ?`)
    .get(id) as { user_id: string; audio_path: string | null } | undefined;

  if (!row) return res.status(404).json({ error: "Message introuvable" });
  if (row.user_id !== userId) return res.status(403).json({ error: "Action interdite" });

  // supprime fichier audio si besoin
  if (row.audio_path) {
    const full = path.join(uploadDir, row.audio_path);
    try {
      fs.unlinkSync(full);
    } catch {}
  }

  db.prepare(`DELETE FROM messages WHERE id = ?`).run(id);
  res.json({ success: true });
}

// =====================
// POST /api/messages/audio (upload)
// =====================

export const uploadAudio = [
  upload.single("audio"),
  (req: MulterRequest, res: Response) => {
    const { room, userId } = req.body as { room?: string; userId?: string };

    if (!room || !userId || !req.file?.filename) {
      return res.status(400).json({ error: "Données manquantes" });
    }

    purgeOldMessages();

    const id = randomUUID();
    const createdAt = now();

    db.prepare(
      `INSERT INTO messages (id, room, user_id, audio_path, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, room, userId, req.file.filename, createdAt);

    res.json({
      id,
      room,
      userId,
      content: null,
      audioUrl: `/uploads/audio/${req.file.filename}`,
      createdAt,
      editedAt: null,
    });
  },
];

