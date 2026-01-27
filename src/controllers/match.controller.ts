import { Request, Response } from "express";
import { db } from "../config/database";

/**
 * GET /api/match
 * Retourne des profils similaires
 */
export function getMatches(req: Request, res: Response) {
  const userId = req.userId; // injecté par middleware auth

  if (!userId) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  // 🔹 récupérer l'histoire de l'utilisateur
  const myStory = db
    .prepare(
      `
      SELECT tags, situation
      FROM stories
      JOIN users ON users.id = stories.user_id
      WHERE user_id = ? AND shared = 1
      `
    )
    .get(userId);

  if (!myStory) {
    return res.json([]);
  }

  const myTags: string[] = myStory.tags
    ? myStory.tags.split(",")
    : [];
  const mySituation = myStory.situation;

  // 🔹 récupérer les autres histoires partagées
  const others = db
    .prepare(
      `
      SELECT
        stories.id,
        stories.title,
        stories.tags,
        stories.created_at,
        users.id as userId,
        users.situation
      FROM stories
      JOIN users ON users.id = stories.user_id
      WHERE stories.shared = 1
        AND users.id != ?
      `
    )
    .all(userId);

  const scored = others
    .map((o: any) => {
      const tags = o.tags ? o.tags.split(",") : [];

      let score = 0;
      const commonTags = tags.filter((t: string) =>
        myTags.includes(t)
      );

      score += commonTags.length * 2;

      if (o.situation && o.situation === mySituation) {
        score += 3;
      }

      return {
        storyId: o.id,
        title: o.title,
        commonTags,
        situation: o.situation,
        score,
        createdAt: o.created_at,
      };
    })
    .filter((m: any) => m.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 6);

  res.json(scored);
}
