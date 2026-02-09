import { Pool } from "pg";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4, // force IPv4 (important sur Railway / Render)
});

// =====================
// TEST CONNEXION DB
// =====================
db.query("SELECT 1")
  .then(() => {
    console.log(" PostgreSQL connected");
  })
  .catch((err: unknown) => {
    if (err instanceof Error) {
      console.error(" DB connection error:", err.message);
    } else {
      console.error("DB connection error:", err);
    }
    process.exit(1); //  IMPORTANT : stoppe le conteneur si DB KO
  });
