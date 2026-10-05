import type { NextFunction, Request, Response } from "express";
import { createClient, type User } from "@supabase/supabase-js";
import { config } from "../config.js";

export type AuthedRequest = Request & { user: User };

const client = config.supabaseUrl && config.supabaseAnonKey
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

/**
 * Verifies the caller's Supabase access token with Supabase Auth on every request.
 * Fails closed: no config, no token, a bad token, or an unreachable auth service never lets a request through.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!client) return fail(res, 503, "AUTH_NOT_CONFIGURED", "Authentication is not configured on the server.");
  const token = /^Bearer\s+(.+)$/i.exec(req.header("authorization") ?? "")?.[1];
  if (!token) return fail(res, 401, "UNAUTHENTICATED", "Sign in required.");
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      const authServiceDown = !error || !error.status || error.status >= 500;
      return authServiceDown
        ? fail(res, 503, "AUTH_UNAVAILABLE", "Could not verify your session. Try again.")
        : fail(res, 401, "UNAUTHENTICATED", "Your session is invalid or has expired.");
    }
    (req as AuthedRequest).user = data.user;
    next();
  } catch {
    fail(res, 503, "AUTH_UNAVAILABLE", "Could not verify your session. Try again.");
  }
}
