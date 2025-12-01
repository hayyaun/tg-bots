import { configDotenv } from "dotenv";
import { SocksProxyAgent } from "socks-proxy-agent";
import converslation from "./converslation";
import inmankist from "./inmankist";
import ivwhat from "./ivwhat";
import log from "./log";
import { connectRedis } from "./redis";

configDotenv();

// Global error handlers to prevent app crashes from unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  log.error("Unhandled Rejection", { reason, promise });
  // Don't exit - just log the error
});

process.on("uncaughtException", (error) => {
  log.error("Uncaught Exception", error);
  // Don't exit - just log the error
});

log.info("App Running", { dev: process.env.DEV });

// Main async function
(async () => {
  // Connect to Redis before starting bots
  await connectRedis();

  const socksAgent = process.env.PROXY
    ? new SocksProxyAgent(process.env.PROXY)
    : undefined;

  const arctypeBot = inmankist.startBot(
    process.env.INMANKIST_BOT_KEY!,
    socksAgent
  );
  const ivwhatBot = ivwhat.startBot(process.env.IVWHAT_BOT_KEY!, socksAgent);
  const converslationBot = converslation.startBot(
    process.env.CONVERSLATION_BOT_KEY!,
    socksAgent
  );

  Promise.all([arctypeBot, ivwhatBot, converslationBot]).then((bots) => {
    log.info("Bots Started: " + bots.map((b) => b.botInfo?.username).join(", "));
  });
})();
