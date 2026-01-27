import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import journalRoutes from "./routes/journal.routes";
import messageRoutes from "./routes/messages.routes"
import matchRoutes from "./routes/match.routes";



// initialise DB (crée tables)
import "./config/database";

export const app = express();

// Middleware JSON
app.use(express.json());

// CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: false,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api", matchRoutes);


// Healthcheck
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
