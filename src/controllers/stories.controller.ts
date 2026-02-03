import { db } from "../config/database";
import { randomUUID } from "crypto";

function safeParseTags(text: string | null): string[] {
  try { return text ? JSON.parse(text) : []; } catch { return []; }
}

export function listStories(req: any, res: any) {
  const q = String(req.query.q || "").trim();
  const tag = String(req.query.tag || "").trim().replace(/^#/, "");

  // facultatif : si token, ton requireAuth n'est pas appelé ici.
  // On laisse "mine" côté front avec localStorage userId.
  // Mais si tu veux sécuriser : fais une version /api/stories/me en auth.
  
  // Base query = published only
  // Search combinée: FTS si dispo, sinon LIKE fallback
  let rows: any[] = [];

  try {
    if (q || tag) {
      const ftsQueryParts: string[] = [];
      if (q) ftsQueryParts.push(q);
      if (tag) ftsQueryParts.push(tag);

      const ftsQuery = ftsQueryParts.join(" ");

      rows = db.prepare(`
        SELECT s.*,
          (SELECT COUNT(*) FROM story_likes l WHERE l.story_id = s.id) AS likes
        FROM stories s
        JOIN stories_fts f ON f.id = s.id
        WHERE s.status = 'published'
          AND s.shared = 1
          AND stories_fts MATCH ?
        ORDER BY s.published_at DESC
        LIMIT 200
      `).all(ftsQuery);
    } else {
      rows = db.prepare(`
        SELECT s.*,
          (SELECT COUNT(*) FROM story_likes l WHERE l.story_id = s.id) AS likes
        FROM stories s
        WHERE s.status = 'published'
          AND s.shared = 1
        ORDER BY s.published_at DESC
        LIMIT 200
      `).all();
    }

    // Filter tag côté SQL si tag seul (FTS tags_text marche déjà, mais on garde le filtre)
    if (tag) {
      rows = rows.filter(r => safeParseTags(r.tags).includes(tag));
    }
  } catch {
    // Fallback si pas FTS
    const like = `%${q}%`;
    rows = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM story_likes l WHERE l.story_id = s.id) AS likes
      FROM stories s
      WHERE s.status='published' AND s.shared=1
        AND (? = '' OR s.title LIKE ? OR s.body LIKE ? OR s.tags LIKE ?)
      ORDER BY s.published_at DESC
      LIMIT 200
    `).all(q, like, like, like);

    if (tag) rows = rows.filter(r => safeParseTags(r.tags).includes(tag));
  }

  res.json(rows.map(r => ({
    id: r.id,
    title: r.title,
    body: r.body,
    tags: safeParseTags(r.tags),
    user_id: r.user_id,
    likes: r.likes ?? 0,
    created_at: r.created_at,
  })));
}

export function likeStory(req: any, res: any) {
  const userId = req.userId;
  const storyId = req.params.id;
  const now = Date.now();

  try {
    db.prepare(`
      INSERT INTO story_likes(story_id, user_id, created_at)
      VALUES (?, ?, ?)
    `).run(storyId, userId, now);
  } catch {}

  res.json({ ok: true });
}

export function unlikeStory(req: any, res: any) {
  const userId = req.userId;
  const storyId = req.params.id;

  db.prepare(`
    DELETE FROM story_likes WHERE story_id=? AND user_id=?
  `).run(storyId, userId);

  res.json({ ok: true });
}
