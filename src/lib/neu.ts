/** EagleDesk is for New Era University accounts only. The backend enforces the same rule on every API request. */
export const NEU_EMAIL_DOMAIN = "neu.edu.ph";

/** True only for addresses at exactly @neu.edu.ph (any letter case); look-alikes such as neu.edu.ph.evil.com fail. */
export function isNeuEmail(email: string | null | undefined): boolean {
  if (typeof email !== "string") return false;
  const at = email.lastIndexOf("@");
  return at > 0 && email.slice(at + 1).toLowerCase() === NEU_EMAIL_DOMAIN;
}

export const NOT_NEU_MESSAGE = "Only New Era University Google accounts (@neu.edu.ph) can sign in to EagleDesk. You have been signed out.";
