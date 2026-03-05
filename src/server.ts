import "dotenv/config";

import express from "express";
import path from "path";
import { app } from "./app";

import translateRoutes from "./routes/translate.routes";
import voiceRoutes from "./routes/voice.routes";
import paymentRoutes from "./routes/payments.routes";

/* STATIC */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/* ROUTES SUPPLÉMENTAIRES */
app.use("/api/translate", translateRoutes);
app.use("/api/voice", voiceRoutes);
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentRoutes
);

/* START */
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});