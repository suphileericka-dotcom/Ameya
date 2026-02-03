import { db } from "../config/database";
import { randomUUID } from "crypto";

export function createReport(req: any, res: any) {
  const reporterId = req.userId;
  const { targetType, targetId, reason, details } = req.body;

  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ error: "missing fields" });
  }

  db.prepare(`
    INSERT INTO reports(id, reporter_id, target_type, target_id, reason, details, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
  `).run(randomUUID(), reporterId, targetType, targetId, reason, details || "", Date.now());

  res.json({ ok: true });
}
