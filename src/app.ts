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

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/messages", messageRoutes);
app.use("/match", matchRoutes);
app.use("/stories", storiesRoutes);
app.use("/mystory", storyRoutes);
app.use("/reports", reportsRoutes);
app.use("/payments", paymentsRoutes);
app.use("/dm", dmRoutes);

// =====================
// HEALTHCHECK
// =====================

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
