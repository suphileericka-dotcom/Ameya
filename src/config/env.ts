import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 8000),
  jwtSecret: process.env.JWT_SECRET || "",
};

if (!env.jwtSecret) {
  throw new Error("JWT_SECRET manquant dans .env");
}
