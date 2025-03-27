import { configDotenv } from "dotenv";
import inmankist from "./inmankist";
import ivwhat from "./ivwhat";
import log from "./log";

configDotenv();

log.info("App Running", { dev: process.env.DEV });

inmankist.startBot();
ivwhat.startBot();
