import express from "express";
import path from "path";
import dotenv from "dotenv";

import { app } from "./app";
import { env } from "./config/env";

import translateRoutes from "./routes/translate.routes";
import userRoutes from "./routes/user.routes";
import paymentRoutes from "./routes/payments.routes"; // si besoin

dotenv.config();

// =====================
// MIDDLEWARES GLOBAUX
// =====================

// JSON (pour toutes les routes sauf webhooks raw)
app.use(express.json());

// =====================
// STATIC FILES
// =====================

// rend accessibles les avatars: /uploads/avatars/xxx.jpg
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// =====================
// ROUTES API
// =====================

// USERS (OBLIGATOIRE pour MySpace)
app.use("/api/user", userRoutes);

// TRANSLATE
app.use("/api/translate", translateRoutes);

// =====================
// WEBHOOKS (RAW BODY)
// ⚠️ DOIT être AVANT listen
// =====================

app.use(
   "/api/payments/webhook",
   express.raw({ type: "application/json" }),
   paymentRoutes
 );

// =====================
// SERVER START
// =====================

app.listen(env.port, () => {
  console.log(`Backend running on http://localhost:${env.port}`);
});
