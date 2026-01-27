import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { detectDanger } from "../middleware/safety.middleware";
import {
  getJournal,
  addJournalEntry,
} from "../controllers/journal.controller";

const router = Router();

// lecture du journal
router.get("/", requireAuth, getJournal);

// écriture (avec sécurité mentale)
router.post("/", requireAuth, detectDanger, addJournalEntry);

export default router;
