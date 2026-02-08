import { Pool } from "pg";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Test connexion
db.query("SELECT 1")
  .then(() => console.log(" PostgreSQL connected"))
  .catch((err) => console.error(" DB connection error:", err));
