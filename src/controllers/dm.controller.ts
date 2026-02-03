import { db } from "../config/database";
import { randomUUID } from "crypto";

/* =====================
   HELPERS
===================== */

function isAcceptedFriend(userId: string, otherId: string) {
  // relation acceptée dans un sens OU l’autre
  const row = db.prepare(`
    SELECT 1 FROM friends
    WHERE (
      (user_id = ? AND friend_id = ?)
      OR (user_id = ? AND friend_id = ?)
    )
    AND status = 'accepted'
    LIMIT 1
  `).get(userId, otherId, otherId, userId);

  return !!row;
}

function hasPaidUnlock(userId: string, otherId: string) {
  const row = db.prepare(`
    SELECT paid FROM dm_unlocks
    WHERE user_id = ? AND target_user_id = ?
    LIMIT 1
  `).get(userId, otherId) as any;

  return row?.paid === 1;
}

function getThreadByUsers(a: string, b: string) {
  // On impose un ordre stable pour l’unique thread
  const userA = a < b ? a : b;
  const userB = a < b ? b : a;

  const row = db.prepare(`
    SELECT * FROM dm_threads
    WHERE user_a = ? AND user_b = ?
    LIMIT 1
  `).get(userA, userB);

  return { row, userA, userB };
}

function assertThreadMember(threadId: string, userId: string) {
  const t = db.prepare(`
    SELECT * FROM dm_threads WHERE id = ? LIMIT 1
  `).get(threadId) as any;

  if (!t) return { ok: false as const, error: "Thread not found" };

  const isMember = (t.user_a === userId || t.user_b === userId);
  if (!isMember) return { ok: false as const, error: "Forbidden" };

  return { ok: true as const, thread: t };
}

/* =====================
   ACCESS CHECK
===================== */

// GET /api/dm/access/:targetUserId
export function canAccessDm(req: any, res: any) {
  const userId = req.userId as string;
  const targetUserId = req.params.targetUserId as string;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!targetUserId) return res.status(400).json({ error: "target missing" });
  if (targetUserId === userId) return res.json({ allowed: false });

  const allowed = isAcceptedFriend(userId, targetUserId) || hasPaidUnlock(userId, targetUserId);

  res.json({ allowed });
}

/* =====================
   LIST THREADS
===================== */

// GET /api/dm/threads
export function listThreads(req: any, res: any) {
  const userId = req.userId as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // Liste des threads où je suis user_a ou user_b
  const rows = db.prepare(`
    SELECT t.*,
      (
        SELECT body FROM dm_messages m
        WHERE m.thread_id = t.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_body,
      (
        SELECT created_at FROM dm_messages m
        WHERE m.thread_id = t.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_at
    FROM dm_threads t
    WHERE t.user_a = ? OR t.user_b = ?
    ORDER BY COALESCE(last_at, t.created_at) DESC
  `).all(userId, userId) as any[];

  const mapped = rows.map(r => {
    const otherUserId = r.user_a === userId ? r.user_b : r.user_a;
    return {
      id: r.id,
      otherUserId,
      lastMessage: r.last_body ?? "",
      lastAt: r.last_at ?? r.created_at,
    };
  });

  res.json(mapped);
}

/* =====================
   CREATE/GET THREAD
===================== */

// POST /api/dm/threads { targetUserId }
export function createOrGetThread(req: any, res: any) {
  const userId = req.userId as string;
  const targetUserId = req.body.targetUserId as string;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!targetUserId) return res.status(400).json({ error: "target missing" });
  if (targetUserId === userId) return res.status(400).json({ error: "invalid" });

  // Sécurité : check accès
  const allowed = isAcceptedFriend(userId, targetUserId) || hasPaidUnlock(userId, targetUserId);
  if (!allowed) return res.status(403).json({ error: "Payment or friendship required" });

  const { row, userA, userB } = getThreadByUsers(userId, targetUserId);

  if (row) return res.json({ id: row.id });

  const id = randomUUID();
  db.prepare(`
    INSERT INTO dm_threads(id, user_a, user_b, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, userA, userB, Date.now());

  res.json({ id });
}

/* =====================
   MESSAGES
===================== */

// GET /api/dm/threads/:threadId/messages
export function listMessages(req: any, res: any) {
  const userId = req.userId as string;
  const threadId = req.params.threadId as string;

  const check = assertThreadMember(threadId, userId);
  if (!check.ok) return res.status(check.error === "Forbidden" ? 403 : 404).json({ error: check.error });

  const rows = db.prepare(`
    SELECT id, sender_id, body, created_at
    FROM dm_messages
    WHERE thread_id = ?
    ORDER BY created_at ASC
    LIMIT 500
  `).all(threadId);

  res.json(rows);
}

// POST /api/dm/threads/:threadId/messages { body }
export function sendMessage(req: any, res: any) {
  const userId = req.userId as string;
  const threadId = req.params.threadId as string;
  const body = String(req.body.body || "").trim();

  if (!body) return res.status(400).json({ error: "empty" });

  const check = assertThreadMember(threadId, userId);
  if (!check.ok) return res.status(check.error === "Forbidden" ? 403 : 404).json({ error: check.error });

  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO dm_messages(id, thread_id, sender_id, body, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, threadId, userId, body, now);

  res.json({ ok: true, id, created_at: now });
}
