import { configDotenv } from "dotenv";
import { SocksProxyAgent } from "socks-proxy-agent";
import { Bot } from "grammy";
import converslation from "./converslation";
import inmankist from "./inmankist";
import ivwhat from "./ivwhat";
import matchfound from "./matchfound";
import log from "./log";
import { connectRedis } from "./redis";
import { connectDB } from "./db";
import { startAPIServer } from "./matchfound/api/server";

configDotenv();

const BOTS = [
  { name: "inmankist", module: inmankist, envKey: "INMANKIST_BOT_KEY" },
  { name: "ivwhat", module: ivwhat, envKey: "IVWHAT_BOT_KEY" },
  { name: "converslation", module: converslation, envKey: "CONVERSLATION_BOT_KEY" },
  { name: "matchfound", module: matchfound, envKey: "MATCHFOUND_BOT_KEY" },
] as const;

interface RunningBot {
  config: typeof BOTS[number];
  bot: Bot;
  username: string;
  restartCount: number;
  lastRestart?: Date;
}

const runningBots = new Map<string, RunningBot>();
let socksAgent: SocksProxyAgent | undefined;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const setupErrorHandling = ({ bot, config }: RunningBot): void => {
  const originalCatch = bot.catch;
  bot.catch = (err) => {
    log.error(`Bot ${config.name} crashed`, err);
    originalCatch?.(err);
    restartBot(config.name).catch((e) => log.error(`Restart failed: ${config.name}`, e));
  };
};

const startBot = async (config: typeof BOTS[number]): Promise<RunningBot | null> => {
  const botKey = process.env[config.envKey];
  if (!botKey) {
    log.warn(`Bot ${config.name} skipped: missing ${config.envKey}`);
    return null;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const bot = await config.module.startBot(botKey, socksAgent);
      const runningBot: RunningBot = {
        config,
        bot,
        username: bot.botInfo?.username || config.name,
        restartCount: 0,
      };
      setupErrorHandling(runningBot);
      runningBots.set(config.name, runningBot);
      if (attempt > 1) log.info(`Bot ${config.name} started on attempt ${attempt}`);
      return runningBot;
    } catch (error) {
      if (attempt === 3) {
        log.error(`Bot ${config.name} failed after 3 attempts`, error);
        return null;
      }
      const delayMs = 2000 * Math.pow(2, attempt - 1);
      log.warn(`Bot ${config.name} failed (${attempt}/3), retrying in ${delayMs}ms...`, error);
      await delay(delayMs);
    }
  }
  return null;
};

const restartBot = async (botName: string): Promise<boolean> => {
  const config = BOTS.find((c) => c.name === botName);
  if (!config) {
    log.error(`Bot ${botName} not found`);
    return false;
  }

  const runningBot = runningBots.get(botName);
  if (runningBot?.lastRestart) {
    const elapsed = Date.now() - runningBot.lastRestart.getTime();
    if (elapsed < 30000) {
      log.warn(`Bot ${botName} restart skipped: cooldown (${Math.ceil((30000 - elapsed) / 1000)}s)`);
      return false;
    }
  }

  log.info(`Restarting bot ${botName}...`);
  if (runningBot) {
    try {
      await runningBot.bot.stop();
    } catch (error) {
      log.error(`Error stopping bot ${botName}`, error);
    }
    runningBots.delete(botName);
    await delay(1000);
  }

  const newBot = await startBot(config);
  if (!newBot) {
    log.error(`Bot ${botName} failed to restart`);
    return false;
  }

  newBot.restartCount = (runningBot?.restartCount || 0) + 1;
  newBot.lastRestart = new Date();
  log.info(`Bot ${botName} restarted (#${newBot.restartCount})`);
  return true;
};

const startAllBots = async (): Promise<void> => {
  log.info(`Starting ${BOTS.length} bot(s)...`);
  const results = await Promise.all(BOTS.map(startBot));
  const successful = results.filter((r): r is RunningBot => r !== null).map((r) => r.username);
  const failed = BOTS.filter((_, i) => results[i] === null).map((c) => c.name);

  if (successful.length > 0) log.info(`✓ Started ${successful.length}/${BOTS.length}: ${successful.join(", ")}`);
  if (failed.length > 0) log.error(`✗ Failed ${failed.length}/${BOTS.length}: ${failed.join(", ")}`);
};

export const restartBotByName = restartBot;
export const getRunningBots = () => Array.from(runningBots.keys());

process.on("unhandledRejection", (reason, promise) => log.error("Unhandled Rejection", { reason, promise }));
process.on("uncaughtException", (error) => log.error("Uncaught Exception", error));

(async () => {
  try {
    log.info("Initializing application...", { dev: process.env.DEV });
    await connectRedis();
    await connectDB();
    socksAgent = process.env.PROXY ? new SocksProxyAgent(process.env.PROXY) : undefined;
    await startAllBots();
    
    // Start API server if MATCHFOUND_BOT_KEY is set (API is part of matchfound)
    if (process.env.MATCHFOUND_BOT_KEY) {
      try {
        await startAPIServer();
      } catch (apiError) {
        log.error("Failed to start API server", apiError);
        // Don't exit - bots can still run without API
      }
    }
    
    log.info("Application initialized successfully");
  } catch (error) {
    log.error("Failed to initialize application", error);
    process.exit(1);
  }
})();
