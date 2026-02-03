import express from "express";
import cors from "cors";

// ROUTES
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import messageRoutes from "./routes/messages.routes";
import matchRoutes from "./routes/match.routes";
import storiesRoutes from "./routes/stories.routes";
import storyRoutes from "./routes/Mystory.routes";
import reportsRoutes from "./routes/reports.routes";
import paymentsRoutes from "./routes/payments.routes";
import dmRoutes from "./routes/dm.routes";

// initialise DB (crée tables)
import "./config/database";

export const app = express();

// =====================
// MIDDLEWARES
// =====================

// JSON body
app.use(express.json());

// CORS (frontend Vite)
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// =====================
// ROUTES API
// =====================

// AUTH
app.use("/api/auth", authRoutes);

// USER (⚠️ TRÈS IMPORTANT)
app.use("/api/user", userRoutes);

// MESSAGES
app.use("/api/messages", messageRoutes);

// MATCH
app.use("/api/match", matchRoutes);

// STORIES
app.use("/api/stories", storiesRoutes);

// MY STORY
app.use("/api/mystory", storyRoutes);

// REPORTS
app.use("/api/reports", reportsRoutes);

// PAYMENTS
app.use("/api/payments", paymentsRoutes);

// DM
app.use("/api/dm", dmRoutes);

// =====================
// HEALTHCHECK
// =====================

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
