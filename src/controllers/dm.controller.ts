import { db } from "../config/database";
import { randomUUID } from "crypto";

/* =====================
   TYPES
===================== */

type DmThreadRow = {
  id: string;
  user_a: string;
  user_b: string;
  created_at: Date;
  last_body: string | null;
  last_at: Date | null;
};

type DmMessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: Date;
};

/* =====================
   HELPERS
===================== */

async function isAcceptedFriend(
  userId: string,
  otherId: string
): Promise<boolean> {
  const result = await db.query(
    `
    SELECT 1 FROM friends
    WHERE (
      (user_id = $1 AND friend_id = $2)
      OR (user_id = $2 AND friend_id = $1)
    )
    AND status = 'accepted'
    LIMIT 1
    `,
    [userId, otherId]
  );

  return result.rowCount === 1;
}

async function hasPaidUnlock(
  userId: string,
  otherId: string
): Promise<boolean> {
  const result = await db.query(
    `
    SELECT paid FROM dm_unlocks
    WHERE user_id = $1 AND target_user_id = $2
    LIMIT 1
    `,
    [userId, otherId]
  );

  return result.rows[0]?.paid === true;
}

async function getThreadByUsers(a: string, b: string) {
  const userA = a < b ? a : b;
  const userB = a < b ? b : a;

  const result = await db.query(
    `
    SELECT *
    FROM dm_threads
    WHERE user_a = $1 AND user_b = $2
    LIMIT 1
    `,
    [userA, userB]
  );

  return { row: result.rows[0], userA, userB };
}

async function assertThreadMember(threadId: string, userId: string) {
  const result = await db.query(
    `SELECT * FROM dm_threads WHERE id = $1 LIMIT 1`,
    [threadId]
  );

  const t = result.rows[0];
  if (!t) return { ok: false as const, error: "Thread not found" };

  if (t.user_a !== userId && t.user_b !== userId) {
    return { ok: false as const, error: "Forbidden" };
  }

  return { ok: true as const, thread: t };
}

/* =====================
   ACCESS CHECK
===================== */

export async function canAccessDm(req: any, res: any) {
  const userId = req.userId as string;
  const targetUserId = req.params.targetUserId as string;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!targetUserId)
    return res.status(400).json({ error: "target missing" });
  if (targetUserId === userId) return res.json({ allowed: false });

  const allowed =
    (await isAcceptedFriend(userId, targetUserId)) ||
    (await hasPaidUnlock(userId, targetUserId));

  res.json({ allowed });
}

/* =====================
   LIST THREADS
===================== */

export async function listThreads(req: any, res: any) {
  const userId = req.userId as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const result = await db.query(
    `
    SELECT t.*,
      (
        SELECT body
        FROM dm_messages m
        WHERE m.thread_id = t.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_body,
      (
        SELECT created_at
        FROM dm_messages m
        WHERE m.thread_id = t.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_at
    FROM dm_threads t
    WHERE t.user_a = $1 OR t.user_b = $1
    ORDER BY COALESCE(last_at, t.created_at) DESC
    `,
    [userId]
  );

  const mapped = (result.rows as DmThreadRow[]).map((r) => {
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
   CREATE / GET THREAD
===================== */

export async function createOrGetThread(req: any, res: any) {
  const userId = req.userId as string;
  const targetUserId = req.body.targetUserId as string;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!targetUserId)
    return res.status(400).json({ error: "target missing" });
  if (targetUserId === userId)
    return res.status(400).json({ error: "invalid" });

  const allowed =
    (await isAcceptedFriend(userId, targetUserId)) ||
    (await hasPaidUnlock(userId, targetUserId));

  if (!allowed) {
    return res
      .status(403)
      .json({ error: "Payment or friendship required" });
  }

  const { row, userA, userB } = await getThreadByUsers(
    userId,
    targetUserId
  );
  if (row) return res.json({ id: row.id });

  const id = randomUUID();

  await db.query(
    `
    INSERT INTO dm_threads (id, user_a, user_b)
    VALUES ($1, $2, $3)
    `,
    [id, userA, userB]
  );

  res.json({ id });
}

/* =====================
   MESSAGES
===================== */

export async function listMessages(req: any, res: any) {
  const userId = req.userId as string;
  const threadId = req.params.threadId as string;

  const check = await assertThreadMember(threadId, userId);
  if (!check.ok) {
    return res
      .status(check.error === "Forbidden" ? 403 : 404)
      .json({ error: check.error });
  }

  const result = await db.query(
    `
    SELECT id, sender_id, body, created_at
    FROM dm_messages
    WHERE thread_id = $1
    ORDER BY created_at ASC
    LIMIT 500
    `,
    [threadId]
  );

  res.json(result.rows as DmMessageRow[]);
}

export async function sendMessage(req: any, res: any) {
  const userId = req.userId as string;
  const threadId = req.params.threadId as string;
  const body = String(req.body.body || "").trim();

  if (!body) return res.status(400).json({ error: "empty" });

  const check = await assertThreadMember(threadId, userId);
  if (!check.ok) {
    return res
      .status(check.error === "Forbidden" ? 403 : 404)
      .json({ error: check.error });
  }

  const id = randomUUID();

  await db.query(
    `
    INSERT INTO dm_messages (id, thread_id, sender_id, body)
    VALUES ($1, $2, $3, $4)
    `,
    [id, threadId, userId, body]
  );

  res.json({ ok: true, id });
}
