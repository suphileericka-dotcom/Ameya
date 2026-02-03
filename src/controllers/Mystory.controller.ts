import { db } from "../config/database";
import { randomUUID } from "crypto";
import { AuthedRequest } from "../middleware/auth.middleware";
import { Response } from "express";

function parseTags(tags: string | null): string[] {
  try {
    return tags ? JSON.parse(tags) : [];
  } catch {
    return [];
  }
}

/* =====================
   SAVE / UPDATE DRAFT
===================== */
export function saveDraft(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id, title, body, tags } = req.body;

  if (!body || body.trim().length < 30) {
    return res.status(400).json({ error: "Body too short" });
  }

  const now = Date.now();
  const safeTitle = title?.trim() || "Mon histoire";
  const tagsJson = JSON.stringify(tags || []);

  // 🔁 UPDATE EXISTING DRAFT
  if (id) {
    const result = db.prepare(`
      UPDATE stories
      SET title = ?, body = ?, tags = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND status = 'draft'
    `).run(safeTitle, body.trim(), tagsJson, now, id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    return res.json({ ok: true, id });
  }

  // 🆕 CREATE NEW DRAFT
  const newId = randomUUID();

  db.prepare(`
    INSERT INTO stories (
      id, user_id, title, body, tags,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)
  `).run(newId, userId, safeTitle, body.trim(), tagsJson, now, now);

  res.json({ ok: true, id: newId });
}

/* =====================
   GET MY DRAFTS
===================== */
export function getMyDrafts(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const rows = db.prepare(`
    SELECT *
    FROM stories
    WHERE user_id = ? AND status = 'draft'
    ORDER BY updated_at DESC, created_at DESC
  `).all(userId);

  res.json(
    rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      tags: parseTags(row.tags),
    }))
  );
}

/* =====================
   DELETE DRAFT
===================== */
export function deleteDraft(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;

  const result = db.prepare(`
    DELETE FROM stories
    WHERE id = ? AND user_id = ? AND status = 'draft'
  `).run(id, userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Draft not found" });
  }

  res.json({ ok: true });
}

/* =====================
   PUBLISH STORY
===================== */
export function publishStory(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;
  const now = Date.now();

  const result = db.prepare(`
    UPDATE stories
    SET status = 'published',
        published_at = ?,
        updated_at = ?,
        shared = 1
    WHERE id = ? AND user_id = ? AND status = 'draft'
  `).run(now, now, id, userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Draft not found" });
  }

  res.json({ ok: true, id });
}
