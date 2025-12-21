import { Context } from "grammy";

export function toPercentage(n: number, max: number) {
  return Math.round((n / max) * 100);
}

export function escapeMarkdownV2(text: string): string {
  return text.replace(/\*\*/g, "*").replace(/[_[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

/**
 * Get display name from first and last name
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns Display name or null if empty
 */
export function getDisplayName(
  firstName?: string,
  lastName?: string
): string | null {
  const name = `${firstName || ""} ${lastName || ""}`.trim();
  return name || null;
}

/**
 * Get display name from Telegram user object
 * @param from - Telegram user object with first_name and last_name
 * @returns Display name or null if empty
 */
export function getDisplayNameFromUser(
  from: { first_name?: string; last_name?: string } | undefined
): string | null {
  if (!from) return null;
  return getDisplayName(from.first_name, from.last_name);
}

/**
 * Get user name from Telegram context
 * Returns username with @ prefix if available, otherwise full name, or "Unknown"
 * @param ctx - Grammy context
 * @returns User name string
 */
export function getUserName(ctx: Context): string {
  const from = ctx.from;
  if (!from) return "Unknown";
  return from.username
    ? `@${from.username}`
    : `${from.first_name || ""} ${from.last_name || ""}`.trim() || "Unknown";
}

/**
 * Converts Persian/Arabic digits to English digits
 * Supports: ۰-۹ (Persian), ٠-٩ (Arabic), and 0-9 (English)
 */
export function convertToEnglishDigits(text: string): string {
  // Persian digits: ۰۱۲۳۴۵۶۷۸۹
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  // Arabic digits: ٠١٢٣٤٥٦٧٨٩
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  
  let result = text;
  
  // Replace Persian digits
  persianDigits.forEach((persianDigit, index) => {
    result = result.replace(new RegExp(persianDigit, "g"), index.toString());
  });
  
  // Replace Arabic digits
  arabicDigits.forEach((arabicDigit, index) => {
    result = result.replace(new RegExp(arabicDigit, "g"), index.toString());
  });
  
  return result;
}
