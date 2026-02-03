import express from "express";
import path from "path";
import dotenv from "dotenv";

import { app } from "./app";
import { env } from "./config/env";

import translateRoutes from "./routes/translate.routes";
import userRoutes from "./routes/user.routes";
import paymentRoutes from "./routes/payments.routes";
import voiceRoutes from "./routes/voice.routes"; //  VOICE IA

dotenv.config();

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
app.use("/api/user", userRoutes);

// TRANSLATE
app.use("/api/translate", translateRoutes);

//  VOICE IA ANONYME (NOUVEAU)
app.use("/api/voice", voiceRoutes);



app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentRoutes
);

// =====================
// SERVER START
// =====================

app.listen(env.port, () => {
  console.log(` Backend running on http://localhost:${env.port}`);
});
