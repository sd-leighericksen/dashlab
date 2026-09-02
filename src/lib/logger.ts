import "server-only";
import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";

export const logger = pino({
  level,
  base: { app: "dashlab" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ["req.headers.authorization", "*.password", "*.secret", "*.token"],
    remove: true,
  },
});

export type Logger = typeof logger;
