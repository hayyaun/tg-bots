import { configDotenv } from "dotenv";
import { Bot } from "grammy";
import { BotCommand } from "grammy/types";
import log from "../log";

configDotenv();

const urlPattern = /(https?:\/\/[^\s]+)/gi;

const options = [
  { domain: "pmc.ncbi.nlm.nih.gov", rhash: "92d33bcf16f5f5" },
  { domain: "nature.com", rhash: "70d5d3c1fc0f12" },
  { domain: "scholar.google.com", rhash: "6fbee84229a302" },
];

const toIVLink = (uri: string, rhash: string) =>
  `https://t.me/iv?url=${uri}&rhash=${rhash}`;

const startBot = async (botKey: string, agent: unknown) => {
  // Bot
  const bot = new Bot(botKey, {
    client: { baseFetchConfig: { agent } },
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

  bot.command("help", (ctx) => {
    ctx.react("⚡");
    const domains = options.map((o) => o.domain).join("\n");
    ctx.reply(`Supported domains: \n\n${domains}`);
  });

  // Callbacks

  bot.on("message:text", (ctx) => {
    if (typeof ctx.from !== "object") return;
    const text = ctx.message.text;
    log.info("IVWhat > Link", { message: text, ...ctx.from });
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
    log.error("IVWhat > BOT", err);
  };

  bot.start();

  await bot.init();
  return bot;
};

export default { startBot };
