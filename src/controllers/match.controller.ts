import { db } from "../config/database";

function parseTags(t: string | null): string[] {
  try { return t ? JSON.parse(t) : []; } catch { return []; }
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...a, ...b]).size || 1;
  return inter / union;
}

function keywordScore(textA: string, textB: string) {
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-zà-ÿ0-9\s]/g, " ").split(/\s+/).filter(w => w.length >= 4);

  const A = new Set(clean(textA));
  const B = new Set(clean(textB));
  const inter = [...A].filter(x => B.has(x)).length;
  return Math.min(1, inter / 12); // plafonné
}

export function getMatches(req: any, res: any) {
  const userId = req.userId;

  // On prend MES histoires publiées (ou brouillons si tu veux)
  const mine = db.prepare(`
    SELECT * FROM stories
    WHERE user_id = ? AND status='published' AND shared=1
    ORDER BY published_at DESC
    LIMIT 3
  `).all(userId);

  if (!mine.length) return res.json([]);

  const myTags = mine.flatMap((s: any) => parseTags(s.tags));
  const myText = mine.map((s: any) => `${s.title || ""} ${s.body}`).join(" ");

  // Histoires des autres
  const others = db.prepare(`
    SELECT * FROM stories
    WHERE user_id != ? AND status='published' AND shared=1
    ORDER BY published_at DESC
    LIMIT 300
  `).all(userId);

  // Score par user (un profil = user)
  const byUser = new Map<string, { userId: string; score: number; common: Set<string>; sample: string }>();

  for (const s of others) {
    const tags = parseTags(s.tags);
    const common = tags.filter(t => myTags.includes(t));
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
      common.forEach(t => current.common.add(t));
    }
  }

  const result = [...byUser.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(r => ({
      id: r.userId,
      summary: r.sample,
      common_tags: [...r.common].slice(0, 5),
    }));

  res.json(result);
}
