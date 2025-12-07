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

// Global error handlers to prevent app crashes from unhandled promise rejections
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

async function startBots(socksAgent?: SocksProxyAgent): Promise<void> {
  const botPromises = BOT_CONFIGS.map((config) => {
    const botKey = process.env[config.envKey];
    if (!botKey) {
      log.warn(`Bot ${config.name} skipped: missing ${config.envKey}`);
      return Promise.reject(new Error(`Missing ${config.envKey}`));
    }
    return config.module.startBot(botKey, socksAgent);
  });

  const results = await Promise.allSettled(botPromises);

  const successful: string[] = [];
  const failed: Array<{ name: string; error: unknown }> = [];

  results.forEach((result, index) => {
    const config = BOT_CONFIGS[index];
    
    if (result.status === "fulfilled" && result.value) {
      const bot = result.value as { botInfo?: { username?: string } };
      const username = bot.botInfo?.username || config.name;
      successful.push(username);
    } else {
      const error = result.status === "rejected" ? result.reason : new Error("Unknown error");
      failed.push({ name: config.name, error });
      log.error(`Bot ${config.name} failed to start`, error);
    }
  });

  if (successful.length > 0) {
    log.info(`Successfully started ${successful.length} bot(s): ${successful.join(", ")}`);
  }
  
  if (failed.length > 0) {
    log.error(`Failed to start ${failed.length} bot(s): ${failed.map((f) => f.name).join(", ")}`);
  }
}

async function main(): Promise<void> {
  log.info("App Running", { dev: process.env.DEV });

  try {
    await connectRedis();
    await connectDB();

    const socksAgent = process.env.PROXY
      ? new SocksProxyAgent(process.env.PROXY)
      : undefined;

    await startBots(socksAgent);
  } catch (error) {
    log.error("Failed to initialize application", error);
    process.exit(1);
  }
}

main();
