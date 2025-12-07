import { configDotenv } from "dotenv";
import { SocksProxyAgent } from "socks-proxy-agent";
import converslation from "./converslation";
import inmankist from "./inmankist";
import ivwhat from "./ivwhat";
import truthcheck from "./truthcheck";
import matchfound from "./matchfound";
import log from "./log";
import { connectRedis } from "./redis";
import { connectDB } from "./db";

configDotenv();

// Global error handlers
process.on("unhandledRejection", (reason, promise) => {
  log.error("Unhandled Rejection", { reason, promise });
});

process.on("uncaughtException", (error) => {
  log.error("Uncaught Exception", error);
});

interface BotConfig {
  name: string;
  module: { startBot: (key: string, agent?: unknown) => Promise<unknown> };
  envKey: string;
}

const BOT_CONFIGS: BotConfig[] = [
  { name: "inmankist", module: inmankist, envKey: "INMANKIST_BOT_KEY" },
  { name: "ivwhat", module: ivwhat, envKey: "IVWHAT_BOT_KEY" },
  { name: "converslation", module: converslation, envKey: "CONVERSLATION_BOT_KEY" },
  { name: "truthcheck", module: truthcheck, envKey: "TRUTHCHECK_BOT_KEY" },
  { name: "matchfound", module: matchfound, envKey: "MATCHFOUND_BOT_KEY" },
];

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startBotWithRetry(
  config: BotConfig,
  socksAgent?: SocksProxyAgent,
  retries = MAX_RETRIES
): Promise<{ bot: unknown; username: string } | null> {
  const botKey = process.env[config.envKey];
  if (!botKey) {
    log.warn(`Bot ${config.name} skipped: missing ${config.envKey}`);
    return null;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const bot = await config.module.startBot(botKey, socksAgent);
      const botInfo = (bot as { botInfo?: { username?: string } })?.botInfo;
      const username = botInfo?.username || config.name;
      
      if (attempt > 1) {
        log.info(`Bot ${config.name} started successfully on attempt ${attempt}`);
      }
      
      return { bot, username };
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
      
      if (isLastAttempt) {
        log.error(`Bot ${config.name} failed after ${retries} attempts`, error);
        return null;
      }
      
      log.warn(
        `Bot ${config.name} failed on attempt ${attempt}/${retries}, retrying in ${delayMs}ms...`,
        error
      );
      await delay(delayMs);
    }
  }
  
  return null;
}

async function startAllBots(socksAgent?: SocksProxyAgent): Promise<void> {
  log.info(`Starting ${BOT_CONFIGS.length} bot(s)...`);
  
  const results = await Promise.all(
    BOT_CONFIGS.map((config) => startBotWithRetry(config, socksAgent))
  );

  const successful = results
    .filter((result): result is { bot: unknown; username: string } => result !== null)
    .map((result) => result.username);
  
  const failed = BOT_CONFIGS
    .filter((_, index) => results[index] === null)
    .map((config) => config.name);

  if (successful.length > 0) {
    log.info(`✓ Successfully started ${successful.length}/${BOT_CONFIGS.length} bot(s): ${successful.join(", ")}`);
  }
  
  if (failed.length > 0) {
    log.error(`✗ Failed to start ${failed.length}/${BOT_CONFIGS.length} bot(s): ${failed.join(", ")}`);
  }
}

async function main(): Promise<void> {
  log.info("Initializing application...", { dev: process.env.DEV });

  try {
    await connectRedis();
    await connectDB();

    const socksAgent = process.env.PROXY
      ? new SocksProxyAgent(process.env.PROXY)
      : undefined;

    await startAllBots(socksAgent);
    log.info("Application initialized successfully");
  } catch (error) {
    log.error("Failed to initialize application", error);
    process.exit(1);
  }
}

main();
