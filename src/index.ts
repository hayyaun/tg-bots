import { configDotenv } from "dotenv";
import { SocksProxyAgent } from "socks-proxy-agent";
import inmankist from "./inmankist";
import ivwhat from "./ivwhat";
import log from "./log";

configDotenv();

log.info("App Running", { dev: process.env.DEV });

const socksAgent = process.env.PROXY
  ? new SocksProxyAgent(process.env.PROXY)
  : undefined;

inmankist.startBot(process.env.ARCHETYPE_BOT_KEY!, socksAgent);
ivwhat.startBot(process.env.IVWHAT_BOT_KEY!, socksAgent);
