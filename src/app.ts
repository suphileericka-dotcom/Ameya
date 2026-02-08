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

// init DB (dotenv déjà chargé depuis server.ts)
import "./config/database";

export const app = express();

// =====================
// MIDDLEWARES
// =====================

// JSON body
app.use(express.json());

// CORS DEV + PROD
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://projet-wine.vercel.app",
    ],
    credentials: true,
  })
);

// =====================
// ROUTES API
// =====================

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/stories", storiesRoutes);
app.use("/api/mystory", storyRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/dm", dmRoutes);

// =====================
// HEALTHCHECK
// =====================

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
