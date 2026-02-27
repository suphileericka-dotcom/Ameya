// src/routes/Mystory.routes.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  saveDraft,
  getMyDrafts,
  deleteDraft,
  publishStory,
} from "../controllers/Mystory.controller";

const router = Router();

router.post("/", requireAuth, saveDraft);
router.get("/me", requireAuth, getMyDrafts);
router.delete("/:id", requireAuth, deleteDraft);
router.put("/:id/publish", requireAuth, publishStory);

export default router;
