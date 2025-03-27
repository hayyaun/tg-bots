import { configDotenv } from "dotenv";
import { Bot } from "grammy";
import { BotCommand } from "grammy/types";
import { SocksProxyAgent } from "socks-proxy-agent";
import log from "../log";

configDotenv();

const socksAgent = process.env.PROXY
  ? new SocksProxyAgent(process.env.PROXY)
  : undefined;

const urlPattern = /(https?:\/\/[^\s]+)/gi;

const options = [{ domain: "pmc.ncbi.nlm.nih.gov", rhash: "92d33bcf16f5f5" }];

const toIVLink = (uri: string, rhash: string) =>
  `https://t.me/iv?url=${uri}&rhash=${rhash}`;

const startBot = async () => {
  // Bot
  const bot = new Bot(process.env.IVWHAT_BOT_KEY!, {
    client: { baseFetchConfig: { agent: socksAgent } },
  });

  // Commands

  const commands: BotCommand[] = [{ command: "start", description: "Start" }];

  await bot.api.setMyCommands(commands);

  bot.command("start", (ctx) => {
    ctx.react("❤‍🔥");
    if (typeof ctx.from !== "object") return;
    log.info("IVWhat > Start", { ...ctx.from });
    ctx.reply("Hi give me a link:");
  });

  // Callbacks

  bot.on("message:text", (ctx) => {
    const text = ctx.message.text;
    const match = text.match(urlPattern);
    if (!match) return ctx.reply("No links detected. Send me a valid URL.");

    const firstLink = match[0]; // Get the first matched URL
    const validOption = options.find((option) =>
      firstLink.includes(option.domain)
    );
    if (!validOption) return ctx.reply(`We don't support this domain yet!`);
    const toURIParams = encodeURIComponent(firstLink);
    ctx.reply(
      `Here's your iv link: ${toIVLink(toURIParams, validOption.rhash)}`
    );
  });

  bot.catch = (err) => {
    log.error("Inmankist > BOT", err);
  };

  bot.start();
};

export default { startBot };
