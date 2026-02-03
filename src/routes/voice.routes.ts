import { Router } from "express";
import { uploadVoiceMulter } from "../middleware/upload.middleware";
import { anonymizeVoiceController } from "../controllers/voice.controller";

const router = Router();

// POST /api/voice/anonymize
router.post(
  "/anonymize",
  uploadVoiceMulter.single("audio"),
  anonymizeVoiceController
);

export default router;
