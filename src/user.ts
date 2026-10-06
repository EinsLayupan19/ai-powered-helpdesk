import { createContext } from "react";
import type { User } from "@supabase/supabase-js";

export type StudentUser = {
  /** Supabase auth user id. Used to key per-user local data. */
  key: string;
  name: string;
  initials: string;
  email: string;
  studentId: string;
  program: string;
  section: string;
};

export const UserContext = createContext<StudentUser>({
  key: "", name: "", initials: "", email: "", studentId: "", program: "", section: "",
});

export const THEME_KEY = "eagledesk.theme";
export function savedTheme(): "dark" | "light" {
  try { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");

/**
 * Display-only mapping. user_metadata can be edited by the user, so it must never be used for
 * authorization. Student ID / program / section show "Not set" until a profiles table exists.
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
    studentId: text(meta.student_id) || "Not set",
    program: text(meta.program) || "Not set",
    section: text(meta.section) || "Not set",
  };
}
