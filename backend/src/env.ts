import "dotenv/config";

function req(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

export const ENV = {
  PORT: Number(process.env.PORT ?? 3000),
  DATABASE_URL: req("DATABASE_URL", "file:./dev.db"),
  JWT_SECRET: req("JWT_SECRET"),
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? "uploads",

  // Partner Service
  PARTNER_API_URL: req("PARTNER_API_URL", "http://localhost:7001"),
  PARTNER_API_KEY: process.env.PARTNER_API_KEY ?? "",
};
