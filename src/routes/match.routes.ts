import { Router } from "express";
import { getMatches } from "../controllers/match.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// 🔐 protégé par JWT
router.get("/match", requireAuth, getMatches);

export default router;
