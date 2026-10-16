/** EagleDesk is for New Era University accounts only. */
export const NEU_EMAIL_DOMAIN = "neu.edu.ph";

/** True only for addresses at exactly @neu.edu.ph (any letter case); look-alikes such as neu.edu.ph.evil.com fail. */
export function isNeuEmail(email: string | null | undefined): boolean {
  if (typeof email !== "string") return false;
  const at = email.lastIndexOf("@");
  return at > 0 && email.slice(at + 1).toLowerCase() === NEU_EMAIL_DOMAIN;
}
