import { db } from "../config/database";

/* =====================
   TYPES
===================== */

type StoryRow = {
  user_id: string;
  title: string | null;
  body: string;
  tags: any;
};

type MatchResult = {
  userId: string;
  score: number;
  common: Set<string>;
  sample: string;
};

/* =====================
   HELPERS
===================== */

function parseTags(t: any): string[] {
  if (!t) return [];
  if (Array.isArray(t)) return t;
  try {
    return JSON.parse(t);
  } catch {
    return [];
  }
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...a, ...b]).size || 1;
  return inter / union;
}

function keywordScore(textA: string, textB: string) {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-zà-ÿ0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4);

  const A = new Set(clean(textA));
  const B = new Set(clean(textB));
  const inter = [...A].filter((x) => B.has(x)).length;
  return Math.min(1, inter / 12);
}

/* =====================
   MATCHING
===================== */

export async function getMatches(req: any, res: any) {
  const userId = req.userId as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // Mes histoires publiées & partagées
  const mineResult = await db.query(
    `
    SELECT id, title, body, tags
    FROM stories
    WHERE user_id = $1
      AND status = 'published'
      AND shared = true
    ORDER BY published_at DESC
    LIMIT 3
    `,
    [userId]
  );

  if (mineResult.rowCount === 0) {
    return res.json([]);
  }

  const mine = mineResult.rows as StoryRow[];

  const myTags = mine.flatMap((s: StoryRow) => parseTags(s.tags));
  const myText = mine
    .map((s: StoryRow) => `${s.title || ""} ${s.body}`)
    .join(" ");

  // Histoires des autres utilisateurs
  const othersResult = await db.query(
    `
    SELECT user_id, title, body, tags
    FROM stories
    WHERE user_id <> $1
      AND status = 'published'
      AND shared = true
    ORDER BY published_at DESC
    LIMIT 300
    `,
    [userId]
  );

  const byUser = new Map<string, MatchResult>();

  for (const s of othersResult.rows as StoryRow[]) {
    const tags = parseTags(s.tags);
    const common = tags.filter((t: string) => myTags.includes(t));

    const tagScore = jaccard(myTags, tags);
    const txtScore = keywordScore(myText, `${s.title || ""} ${s.body}`);
    const score = 0.7 * tagScore + 0.3 * txtScore;

    const current = byUser.get(s.user_id);
    if (!current || score > current.score) {
      byUser.set(s.user_id, {
        userId: s.user_id,
        score,
        common: new Set(common),
        sample: s.body.slice(0, 120),
      });
    } else {
      common.forEach((t: string) => current.common.add(t));
    }
  }

  const result = [...byUser.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((r) => ({
      id: r.userId,
      summary: r.sample,
      common_tags: [...r.common].slice(0, 5),
    }));

  res.json(result);
}
