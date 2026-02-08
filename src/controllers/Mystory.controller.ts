import { db } from "../config/database";
import { randomUUID } from "crypto";
import { AuthedRequest } from "../middleware/auth.middleware";
import { Response } from "express";

/* =====================
   TYPES
===================== */

type DraftRow = {
  id: string;
  title: string;
  body: string;
  tags: any;
};

/* =====================
   HELPERS
===================== */

function parseTags(tags: any): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

/* =====================
   SAVE / UPDATE DRAFT
===================== */
export async function saveDraft(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id, title, body, tags } = req.body as {
    id?: string;
    title?: string;
    body?: string;
    tags?: string[];
  };

  if (!body || body.trim().length < 30) {
    return res.status(400).json({ error: "Body too short" });
  }

  const safeTitle = title?.trim() || "Mon histoire";
  const tagsJson = tags ?? [];

  /* ========= UPDATE EXISTING DRAFT ========= */
  if (id) {
    const result = await db.query(
      `
      UPDATE stories
      SET title = $1,
          body = $2,
          tags = $3,
          updated_at = NOW()
      WHERE id = $4
        AND user_id = $5
        AND status = 'draft'
      `,
      [safeTitle, body.trim(), tagsJson, id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    return res.json({ ok: true, id });
  }

  /* ========= CREATE NEW DRAFT ========= */
  const newId = randomUUID();

  await db.query(
    `
    INSERT INTO stories (
      id, user_id, title, body, tags, status
    )
    VALUES ($1, $2, $3, $4, $5, 'draft')
    `,
    [newId, userId, safeTitle, body.trim(), tagsJson]
  );

  res.json({ ok: true, id: newId });
}

/* =====================
   GET MY DRAFTS
===================== */
export async function getMyDrafts(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const result = await db.query<DraftRow>(
    `
    SELECT id, title, body, tags
    FROM stories
    WHERE user_id = $1
      AND status = 'draft'
    ORDER BY updated_at DESC, created_at DESC
    `,
    [userId]
  );

  res.json(
    result.rows.map((row: DraftRow) => ({
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
export async function deleteDraft(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;

  const result = await db.query(
    `
    DELETE FROM stories
    WHERE id = $1
      AND user_id = $2
      AND status = 'draft'
    `,
    [id, userId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Draft not found" });
  }

  res.json({ ok: true });
}

/* =====================
   PUBLISH STORY
===================== */
export async function publishStory(req: AuthedRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.params;

  const result = await db.query(
    `
    UPDATE stories
    SET status = 'published',
        published_at = NOW(),
        updated_at = NOW(),
        shared = true
    WHERE id = $1
      AND user_id = $2
      AND status = 'draft'
    `,
    [id, userId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Draft not found" });
  }

  res.json({ ok: true, id });
}
