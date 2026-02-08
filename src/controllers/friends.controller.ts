import { db } from "../config/database";

/* =====================
   ADD FRIEND
===================== */

export async function addFriend(req: any, res: any) {
  const userId = req.userId as string;
  const friendId = req.params.id as string;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!friendId) return res.status(400).json({ error: "missing" });
  if (friendId === userId) {
    return res.status(400).json({ error: "invalid" });
  }

  try {
    await db.query(
      `
      INSERT INTO friends (user_id, friend_id, status)
      VALUES ($1, $2, 'pending')
      ON CONFLICT (user_id, friend_id) DO NOTHING
      `,
      [userId, friendId]
    );
  } catch (err) {
    // log utile en dev, silencieux en prod si tu veux
    console.error("addFriend error:", err);
  }

  res.json({ ok: true });
}

/* =====================
   ACCEPT FRIEND
===================== */

export async function acceptFriend(req: any, res: any) {
  const userId = req.userId as string;
  const friendId = req.params.id as string;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!friendId) return res.status(400).json({ error: "missing" });

  // Accepte la demande existante
  await db.query(
    `
    UPDATE friends
    SET status = 'accepted'
    WHERE user_id = $1
      AND friend_id = $2
      AND status = 'pending'
    `,
    [friendId, userId]
  );

  // Relation inverse (optionnelle mais pratique)
  await db.query(
    `
    INSERT INTO friends (user_id, friend_id, status)
    VALUES ($1, $2, 'accepted')
    ON CONFLICT (user_id, friend_id) DO NOTHING
    `,
    [userId, friendId]
  );

  res.json({ ok: true });
}
