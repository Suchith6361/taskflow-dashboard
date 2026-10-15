import { createApp } from "./app.js";
import { createPool } from "./config/db.js";
import { getConfig } from "./config/env.js";

let config;
try {
  config = getConfig();
} catch (error) {
  console.error(`Configuration error: ${error.message}`);
  process.exit(1);
}

const pool = createPool(config.db);
const app = createApp({ pool, config });
const server = app.listen(config.port, () => {
  console.info(`TaskFlow API listening on port ${config.port} (${config.nodeEnv}).`);
});

async function shutdown(signal) {
  console.info(`${signal} received; closing API server.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
