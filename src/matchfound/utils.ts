import { Context } from "grammy";

export function getUserName(ctx: Context): string {
  const from = ctx.from;
  if (!from) return "Unknown";
  return from.username
    ? `@${from.username}`
    : `${from.first_name || ""} ${from.last_name || ""}`.trim() || "Unknown";
}

export function calculateAge(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1;
  }
  return age;
}

