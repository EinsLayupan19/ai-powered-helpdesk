import { createContext } from "react";
import type { User } from "@supabase/supabase-js";

export type StudentUser = {
  /** Supabase auth user id. Used to key per-user local data. */
  key: string;
  name: string;
  initials: string;
  email: string;
};

export const UserContext = createContext<StudentUser>({
  key: "", name: "", initials: "", email: "",
});

export const THEME_KEY = "eagledesk.theme";
export function savedTheme(): "dark" | "light" {
  try { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");

/** The columns of the student's own public.profiles row shown on the Profile page (RLS: own row only). */
export type ProfileRow = { student_number: string | null; program: string | null; section: string | null };
export type ProfileFields = { studentId: string; program: string; section: string };
export const NOT_SET = "Not set";

/** Profile page values from the student's profiles row. A missing row (null) or empty column shows "Not set". */
export function profileFields(row: ProfileRow | null): ProfileFields {
  return {
    studentId: text(row?.student_number) || NOT_SET,
    program: text(row?.program) || NOT_SET,
    section: text(row?.section) || NOT_SET,
  };
}

/**
 * Display-only mapping. user_metadata can be edited by the user, so it must never be used for
 * authorization. Student ID / program / section come from the profiles table (profileFields), not from here.
 */
export function toStudentUser(u: User): StudentUser {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const email = u.email ?? "";
  const fromEmail = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const name = text(meta.full_name) || text(meta.name) || fromEmail || "Student";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "S";
  return {
    key: u.id,
    name,
    initials,
    email,
  };
}
