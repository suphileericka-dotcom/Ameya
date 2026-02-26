import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL manquant dans les variables d’environnement");
}

export const db = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

// Test connexion
db.query("SELECT 1")
  .then(() => console.log(" PostgreSQL connected"))
  .catch((err) => console.error(" DB connection error:", err));
