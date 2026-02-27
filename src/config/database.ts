import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL manquant dans les variables d’environnement");
}

export const db = new Pool({
  host: "db.djixjstkixsloazjiztk.supabase.co",
  port: 5432,
  user: "postgres",
  password: "KPtAL185yLyj6nB6",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
// =====================
// TEST CONNEXION DB
// =====================
db.query("SELECT 1")
  .then(() => {
    console.log(" PostgreSQL connected");
  })
  .catch((err: unknown) => {
    console.error(" DB connection error:", err);
    process.exit(1);
  });
