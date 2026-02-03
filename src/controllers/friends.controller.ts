import { db } from "../config/database";

export function addFriend(req: any, res: any) {
  const userId = req.userId;
  const friendId = req.params.id;
  const now = Date.now();

  if (friendId === userId) return res.status(400).json({ error: "invalid" });

  try {
    db.prepare(`
      INSERT INTO friends(user_id, friend_id, status, created_at)
      VALUES (?, ?, 'pending', ?)
    `).run(userId, friendId, now);
  } catch {}

  res.json({ ok: true });
}

export function acceptFriend(req: any, res: any) {
  const userId = req.userId;
  const friendId = req.params.id;

  db.prepare(`
    UPDATE friends SET status='accepted'
    WHERE user_id=? AND friend_id=? AND status='pending'
  `).run(friendId, userId);

  // (optionnel) relation inverse
  try {
    db.prepare(`
      INSERT INTO friends(user_id, friend_id, status, created_at)
      VALUES (?, ?, 'accepted', ?)
    `).run(userId, friendId, Date.now());
  } catch {}

  res.json({ ok: true });
}
