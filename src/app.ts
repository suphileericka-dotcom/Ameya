import "dotenv/config";

import express, { Request, Response } from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import messageRoutes from "./routes/messages.routes";
import matchRoutes from "./routes/match.routes";
import storiesRoutes from "./routes/stories.routes";
import storyRoutes from "./routes/Mystory.routes";
import reportsRoutes from "./routes/reports.routes";
import paymentsRoutes from "./routes/payments.routes";
import dmRoutes from "./routes/dm.routes";

import "./config/database";

export const app = express();

/* =====================
   MIDDLEWARES
===================== */

app.use(express.json());

/* =====================
   CORS
===================== */

const allowedOrigins = [
  "http://localhost:5173",
  "https://projet-one-pi.vercel.app",
];

app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

/* =====================
   ROUTES
===================== */

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/stories", storiesRoutes);
app.use("/api/mystory", storyRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/dm", dmRoutes);

/* =====================
   HEALTHCHECK
===================== */

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});