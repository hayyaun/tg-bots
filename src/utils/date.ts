/**
 * Get today's date string in YYYY-MM-DD format (UTC)
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get remaining seconds until midnight UTC
 * @returns Number of seconds until midnight UTC
 */
export function getSecondsUntilMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

