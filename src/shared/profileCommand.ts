import { Bot } from "grammy";
import log from "../log";
import { getUserProfile, updateCompletionScore } from "./database";
import { displayProfile } from "./display";
import { getSharedStrings } from "./i18n";

export interface ProfileCommandDependencies {
  botName: string;
  notifyAdmin?: (message: string) => Promise<void>;
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

    try {
      // Recalculate completion score to ensure it's up to date
      await updateCompletionScore(userId);
      const profile = await getUserProfile(userId);
      if (!profile) {
        const strings = await getSharedStrings(userId, deps.botName);
        await ctx.reply(strings.startFirst);
        return;
      }

      await displayProfile(ctx, profile, deps.botName, userId);
    } catch (err) {
      log.error(deps.botName + " > Profile command failed", err);
      const strings = await getSharedStrings(userId, deps.botName);
      await ctx.reply(strings.profileError);
      if (deps.notifyAdmin) {
        await deps.notifyAdmin(
          `❌ <b>Profile Command Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
        );
      }
    }
  });
}
