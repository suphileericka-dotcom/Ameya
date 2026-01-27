import { Router } from "express";
import {
  getMessages,
  postMessage,
} from "../controllers/message.controller";

const router = Router();

router.get("/", getMessages);
router.post("/", postMessage);

export default router;
