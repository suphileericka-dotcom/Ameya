import { Router } from "express";
import {
  getMessages,
  postMessage,
  updateMessage,
  deleteMessage,
  uploadAudio,
} from "../controllers/message.controller";

const router = Router();

router.get("/", getMessages);
router.post("/", postMessage);
router.put("/:id", updateMessage);
router.delete("/:id", deleteMessage);

// Upload audio
router.post("/audio", ...uploadAudio);

export default router;
