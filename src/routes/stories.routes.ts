import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  listStories,
  likeStory,
  unlikeStory,
} from "../controllers/stories.controller";

const router = Router();

// Public list (mais peut aussi inclure "mine" si token)
router.get("/", listStories);

// Like/unlike => auth
router.post("/:id/like", requireAuth, likeStory);
router.delete("/:id/like", requireAuth, unlikeStory);

export default router;
