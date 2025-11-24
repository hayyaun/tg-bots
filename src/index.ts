import { configDotenv } from "dotenv";
import { SocksProxyAgent } from "socks-proxy-agent";
import converslation from "./converslation";
import inmankist from "./inmankist";
import ivwhat from "./ivwhat";
import log from "./log";

configDotenv();

log.info("App Running", { dev: process.env.DEV });

const socksAgent = process.env.PROXY
  ? new SocksProxyAgent(process.env.PROXY)
  : undefined;

const arctypeBot = inmankist.startBot(
  process.env.ARCHETYPE_BOT_KEY!,
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
