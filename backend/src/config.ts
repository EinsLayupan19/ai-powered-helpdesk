// Loads backend/.env when present (Node built-in; no extra dependency).
try { process.loadEnvFile(); } catch { /* no .env file; use the real environment */ }

export const config = {
  port: Number(process.env.PORT) || 3001,
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
};
