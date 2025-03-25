import winston from "winston";

const log = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.metadata({
          fillExcept: ["level", "message", "timestamp"],
        }), // Keep extra data
        winston.format.printf(function ({ level, message, metadata }) {
          return `${new Date().toISOString()} [${level}]: ${message} ${JSON.stringify(metadata)}`;
        })
      ),
    }),
  ],
});

export default log;
