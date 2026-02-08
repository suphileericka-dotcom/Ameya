import Stripe from "stripe";
import type { Stripe as StripeType } from "stripe";
import { db } from "../config/database";
import { Request, Response } from "express";

/* =====================
   STRIPE INIT (SAFE)
===================== */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let stripe: Stripe | null = null;

if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
  console.log("Stripe initialized");
} else {
  console.warn("Stripe disabled (STRIPE_SECRET_KEY missing)");
}

/* =====================
   CHECKOUT DM
===================== */

export async function createDmCheckoutSession(req: Request, res: Response) {
  if (!stripe) {
    return res.status(503).json({
      error: "Payments are disabled (Stripe not configured)",
    });
  }

  const userId = (req as any).userId as string | undefined;
  const targetUserId = req.body?.targetUserId as string | undefined;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!targetUserId) {
    return res.status(400).json({ error: "target missing" });
  }

  // Vérifie si déjà payé
  const existing = await db.query(
    `
    SELECT paid
    FROM dm_unlocks
    WHERE user_id = $1 AND target_user_id = $2
    `,
    [userId, targetUserId]
  );

  if (existing.rows[0]?.paid === true) {
    return res.json({ alreadyPaid: true });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Débloquer messages privés",
            },
            unit_amount: 499, // 4,99 €
          },
          quantity: 1,
        },
      ],
      success_url: `http://localhost:5173/private-chat/${targetUserId}?paid=1`,
      cancel_url: `http://localhost:5173/match?cancel=1`,
      metadata: { userId, targetUserId },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return res.status(500).json({ error: "Stripe checkout failed" });
  }
}

/* =====================
   STRIPE WEBHOOK
===================== */

export async function stripeWebhook(req: Request, res: Response) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send("Stripe not configured");
  }

  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) {
    return res.status(400).send("Missing Stripe signature");
  }

  let event: StripeType.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Stripe webhook error:", err.message);
    return res.status(400).send("Webhook Error");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as StripeType.Checkout.Session;

    const userId = session.metadata?.userId;
    const targetUserId = session.metadata?.targetUserId;

    if (userId && targetUserId) {
      await db.query(
        `
        INSERT INTO dm_unlocks (
          user_id,
          target_user_id,
          paid,
          provider,
          provider_ref
        )
        VALUES ($1, $2, true, 'stripe', $3)
        ON CONFLICT (user_id, target_user_id)
        DO UPDATE SET
          paid = true,
          provider = 'stripe',
          provider_ref = EXCLUDED.provider_ref
        `,
        [userId, targetUserId, session.id]
      );
    }
  }

  return res.json({ received: true });
}
