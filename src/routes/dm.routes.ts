import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  canAccessDm,
  createOrGetThread,
  listThreads,
  listMessages,
  sendMessage,
} from "../controllers/dm.controller";

const router = Router();

// Vérifie si user a accès au DM avec targetUserId
router.get("/access/:targetUserId", requireAuth, canAccessDm);

// Liste des conversations privées
router.get("/threads", requireAuth, listThreads);

// Crée ou récupère le thread avec un utilisateur (si accès ok)
router.post("/threads", requireAuth, createOrGetThread);

// Messages d’un thread
router.get("/threads/:threadId/messages", requireAuth, listMessages);
router.post("/threads/:threadId/messages", requireAuth, sendMessage);

export default router;
