import { isPrivilegedSupabaseKey } from "../knowledge/index.js";
import { createStudentSignIn, type StudentSignIn } from "./studentSignIn.js";

export { STUDENT_ID_PATTERN, createStudentSignIn } from "./studentSignIn.js";
export type { StudentSignIn, StudentSignInResult, StudentSession } from "./studentSignIn.js";

export type StudentSignInSettings = { supabaseUrl?: string; supabaseAnonKey?: string; supabaseServiceRoleKey?: string };

/**
 * Student ID sign-in needs SUPABASE_SERVICE_ROLE_KEY to look accounts up. Without a real service-role key it is
 * switched off (null) and the login page tells students to use their university email instead.
 */
export function buildStudentSignIn(settings: StudentSignInSettings): { signIn: StudentSignIn | null; warning: string | null } {
  const url = settings.supabaseUrl?.trim();
  const anonKey = settings.supabaseAnonKey?.trim();
  const serviceRoleKey = settings.supabaseServiceRoleKey?.trim();
  if (!serviceRoleKey) return { signIn: null, warning: null };
  if (!url || !anonKey) return { signIn: null, warning: "[auth] Student ID sign-in is off: SUPABASE_URL and SUPABASE_ANON_KEY are also required." };
  if (!isPrivilegedSupabaseKey(serviceRoleKey)) {
    return { signIn: null, warning: "[auth] Student ID sign-in is off: SUPABASE_SERVICE_ROLE_KEY is not a service-role key." };
  }
  return { signIn: createStudentSignIn({ url, anonKey, serviceRoleKey }), warning: null };
}
