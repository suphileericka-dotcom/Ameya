import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { me } from "../controllers/user.controller";

const router = Router();

router.get("/me", requireAuth, me);

export default router;
