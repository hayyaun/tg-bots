import { Bot, Context } from "grammy";
import log from "../log";
import { getUserProfile, updateCompletionScore } from "./database";
import { displayProfile } from "./display";
import { getSharedStrings } from "./i18n";

export interface ProfileCommandDependencies {
  botName: string;
  notifyAdmin?: (message: string) => Promise<void>;
}

/**
 * Shared helper function to display user profile
 * Used by both /profile command and profile callback
 */
export async function handleDisplayProfile(
  ctx: Context,
  userId: number,
  botName: string,
  notifyAdmin?: (message: string) => Promise<void>
): Promise<void> {
  try {
    // Recalculate completion score to ensure it's up to date
    await updateCompletionScore(userId);
    const profile = await getUserProfile(userId);
    if (!profile) {
      const strings = await getSharedStrings(userId, botName);
      await ctx.reply(strings.startFirst);
      return;
    }

    await displayProfile(ctx, profile, botName, userId);
  } catch (err) {
    log.error(botName + " > Display profile failed", err);
    const strings = await getSharedStrings(userId, botName);
    await ctx.reply(strings.profileError);
    if (notifyAdmin) {
      await notifyAdmin(
        `❌ <b>Display Profile Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
  }
}

/**
 * Sets up the /profile command for a bot
 * This command displays the user's profile with completion score
 */
export function setupProfileCommand(
  bot: Bot,
  deps: ProfileCommandDependencies
): void {
  bot.command("profile", async (ctx) => {
    ctx.react("🤔").catch(() => {});
    const userId = ctx.from?.id;
    if (!userId) return;

    await handleDisplayProfile(ctx, userId, deps.botName, deps.notifyAdmin);
  });
}
