import { configDotenv } from "dotenv";
import inmankist from "./inmankist";
import log from "./log";

configDotenv();

log.info("App Running", { dev: process.env.DEV });

inmankist.startBot();
