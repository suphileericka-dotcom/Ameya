import { db } from "../config/database";

/* =====================
   TYPES
===================== */

type StoryListRow = {
  id: string;
  title: string | null;
  body: string;
  tags: any;
  user_id: string;
  likes: number | string;
  created_at: Date;
};

/* =====================
   HELPERS
===================== */

function safeParseTags(tags: any): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

/* =====================
   LIST STORIES
===================== */

export async function listStories(req: any, res: any) {
  const q = String(req.query.q || "").trim();
  const tag = String(req.query.tag || "").trim().replace(/^#/, "");

  let result;

  if (q || tag) {
    const search = [q, tag].filter(Boolean).join(" ");

    result = await db.query<StoryListRow>(
      `
      SELECT s.*,
        (
          SELECT COUNT(*) FROM story_likes l
          WHERE l.story_id = s.id
        ) AS likes
      FROM stories s
      WHERE s.status = 'published'
        AND s.shared = true
        AND s.search @@ plainto_tsquery('simple', $1)
      ORDER BY s.published_at DESC
      LIMIT 200
      `,
      [search]
    );
  } else {
    result = await db.query<StoryListRow>(
      `
      SELECT s.*,
        (
          SELECT COUNT(*) FROM story_likes l
          WHERE l.story_id = s.id
        ) AS likes
      FROM stories s
      WHERE s.status = 'published'
        AND s.shared = true
      ORDER BY s.published_at DESC
      LIMIT 200
      `
    );
  }

  let rows = result.rows as StoryListRow[];

  // Filtre tags (JSONB) côté Node
  if (tag) {
    rows = rows.filter((r: StoryListRow) =>
      safeParseTags(r.tags).includes(tag)
    );
  }

  res.json(
    rows.map((r: StoryListRow) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      tags: safeParseTags(r.tags),
      user_id: r.user_id,
      likes: Number(r.likes || 0),
      created_at: r.created_at,
    }))
  );
}

/* =====================
   LIKE STORY
===================== */

export async function likeStory(req: any, res: any) {
  const userId = req.userId as string;
  const storyId = req.params.id as string;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  await db.query(
    `
    INSERT INTO story_likes (story_id, user_id)
    VALUES ($1, $2)
    ON CONFLICT (story_id, user_id) DO NOTHING
    `,
    [storyId, userId]
  );

  res.json({ ok: true });
}

/* =====================
   UNLIKE STORY
===================== */

export async function unlikeStory(req: any, res: any) {
  const userId = req.userId as string;
  const storyId = req.params.id as string;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  await db.query(
    `
    DELETE FROM story_likes
    WHERE story_id = $1 AND user_id = $2
    `,
    [storyId, userId]
  );

  res.json({ ok: true });
}
