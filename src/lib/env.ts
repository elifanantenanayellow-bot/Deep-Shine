// Centralized, validated environment access.
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  // A dev fallback keeps local builds working; production must set JWT_SECRET.
  JWT_SECRET: required(
    "JWT_SECRET",
    process.env.NODE_ENV === "production"
      ? undefined
      : "dev-only-insecure-secret-change-me-please-32chars",
  ),
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};
