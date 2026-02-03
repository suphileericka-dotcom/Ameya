import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { addFriend, acceptFriend } from "../controllers/friends.controller";

const router = Router();

router.post("/:id", requireAuth, addFriend);
router.post("/:id/accept", requireAuth, acceptFriend);

export default router;
