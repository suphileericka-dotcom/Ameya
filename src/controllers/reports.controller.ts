import { db } from "../config/database";
import { randomUUID } from "crypto";
import { Request, Response } from "express";

export async function createReport(req: Request, res: Response) {
  const reporterId = (req as any).userId as string | undefined;
  const { targetType, targetId, reason, details } = req.body as {
    targetType?: string;
    targetId?: string;
    reason?: string;
    details?: string;
  };

  if (!reporterId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ error: "missing fields" });
  }

  await db.query(
    `
    INSERT INTO reports (
      id,
      reporter_id,
      target_type,
      target_id,
      reason,
      details,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'open')
    `,
    [
      randomUUID(),
      reporterId,
      targetType,
      targetId,
      reason,
      details ?? "",
    ]
  );

  res.json({ ok: true });
}
