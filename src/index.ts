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
  // Don't exit - just log the error
});

process.on("uncaughtException", (error) => {
  log.error("Uncaught Exception", error);
  // Don't exit - just log the error
});

log.info("App Running", { dev: process.env.DEV });

// Main async function
(async () => {
  // Connect to Redis and PostgreSQL before starting bots
  await connectRedis();
  await connectDB();

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
  const truthcheckBot = truthcheck.startBot(
    process.env.TRUTHCHECK_BOT_KEY!,
    socksAgent
  );
  const matchfoundBot = matchfound.startBot(
    process.env.MATCHFOUND_BOT_KEY!,
    socksAgent
  );

  Promise.all([arctypeBot, ivwhatBot, converslationBot, truthcheckBot, matchfoundBot]).then((bots) => {
    log.info("Bots Started: " + bots.map((b) => b.botInfo?.username).join(", "));
  });
})();
