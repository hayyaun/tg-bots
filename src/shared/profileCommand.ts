import { Bot } from "grammy";
import log from "../log";
import { getUserProfile, updateCompletionScore } from "./database";
import { displayProfile } from "./display";
import { errors } from "./errors";

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
        await ctx.reply(errors.startFirst);
        return;
      }

      await displayProfile(ctx, profile);
    } catch (err) {
      log.error(deps.botName + " > Profile command failed", err);
      await ctx.reply("❌ خطا در نمایش پروفایل. لطفا دوباره تلاش کنید.");
      if (deps.notifyAdmin) {
        await deps.notifyAdmin(
          `❌ <b>Profile Command Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
        );
      }
    }
  });
}
