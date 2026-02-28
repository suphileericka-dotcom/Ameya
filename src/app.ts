import express, { Request, Response } from "express";
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

// init DB
import "./config/database";

export const app = express();

/* =====================
   MIDDLEWARES
===================== */

app.use(express.json());

/* =====================
   CORS CONFIG SAFE
===================== */

const allowedOrigins = [
  "http://localhost:5173",
  "https://projet-azure.vercel.app",
];

app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Autorise requêtes serveur (Postman, curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Autorise localhost et domaine principal
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Autorise toutes les previews Vercel
      if (origin.endsWith(".vercel.app")) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Gestion explicite du preflight
app.options("*", cors());

/* =====================
   ROUTES API
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