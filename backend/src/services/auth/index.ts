import { isPrivilegedSupabaseKey } from "../knowledge/index.js";
import { createStudentPasswordReset, createStudentSignIn, type StudentPasswordReset, type StudentSignIn } from "./studentSignIn.js";
import { createStudentRegistration, type StudentRegistration } from "./registration.js";

export { STUDENT_ID_PATTERN, createStudentPasswordReset, createStudentSignIn } from "./studentSignIn.js";
export type { StudentPasswordReset, StudentResetResult, StudentSignIn, StudentSignInResult, StudentSession } from "./studentSignIn.js";
export { NEU_EMAIL_DOMAIN, isNeuEmail } from "./neu.js";
export { createStudentRegistration } from "./registration.js";
export type { RegistrationInput, RegistrationResult, StudentRegistration } from "./registration.js";

export type StudentSignInSettings = { supabaseUrl?: string; supabaseAnonKey?: string; supabaseServiceRoleKey?: string };

/**
 * Student ID sign-in needs SUPABASE_SERVICE_ROLE_KEY to look accounts up. Without a real service-role key it is
 * switched off (null) and the login page points students to Continue with Google instead.
 */
export function buildStudentSignIn(settings: StudentSignInSettings): { signIn: StudentSignIn | null; reset: StudentPasswordReset | null; register: StudentRegistration | null; warning: string | null } {
  const url = settings.supabaseUrl?.trim();
  const anonKey = settings.supabaseAnonKey?.trim();
  const serviceRoleKey = settings.supabaseServiceRoleKey?.trim();
  const off = (warning: string | null) => ({ signIn: null, reset: null, register: null, warning });
  if (!serviceRoleKey) return off(null);
  if (!url || !anonKey) return off("[auth] Student ID sign-in is off: SUPABASE_URL and SUPABASE_ANON_KEY are also required.");
  if (!isPrivilegedSupabaseKey(serviceRoleKey)) return off("[auth] Student ID sign-in is off: SUPABASE_SERVICE_ROLE_KEY is not a service-role key.");
  const options = { url, anonKey, serviceRoleKey };
  return { signIn: createStudentSignIn(options), reset: createStudentPasswordReset(options), register: createStudentRegistration(options), warning: null };
}
