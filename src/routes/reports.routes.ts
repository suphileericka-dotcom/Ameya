import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { createReport } from "../controllers/reports.controller";

const router = Router();
router.post("/", requireAuth, createReport);
export default router;
