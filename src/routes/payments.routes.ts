import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { createDmCheckoutSession, stripeWebhook } from "../controllers/payments.controller";

const router = Router();

router.post("/dm", requireAuth, createDmCheckoutSession);

// ⚠️ webhook doit être raw body (on le branchera dans server.ts)
router.post("/webhook", stripeWebhook);

export default router;
