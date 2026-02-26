// =====================
// ENV (DOIT ÊTRE EN PREMIER)
// =====================
import "dotenv/config";

// =====================
// IMPORTS
// =====================
import express from "express";
import path from "path";

import { app } from "./app";
import { env } from "./config/env";

import translateRoutes from "./routes/translate.routes";
import userRoutes from "./routes/user.routes";
import paymentRoutes from "./routes/payments.routes";
import voiceRoutes from "./routes/voice.routes"; // VOICE IA

// =====================
// MIDDLEWARES GLOBAUX
// =====================

// JSON (pour toutes les routes sauf webhooks raw)
app.use(express.json({ limit: "2mb" }));

// =====================
// STATIC FILES
// =====================

// rend accessibles :
// - avatars
// - audios IA anonymisés
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

// =====================
// ROUTES API
// =====================

// USERS
app.use("/user", userRoutes);

// TRANSLATE
app.use("/translate", translateRoutes);

// VOICE IA ANONYME
app.use("/voice", voiceRoutes);

// PAYMENTS WEBHOOK (RAW)
app.use(
  "/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentRoutes
);

// =====================
// SERVER START
// =====================

if (process.env.NODE_ENV !== "production") {
  app.listen(env.port, () => {
    console.log(`Backend running on port ${env.port}`);
  });
}
