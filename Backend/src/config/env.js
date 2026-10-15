import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const required = (name, value) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

export function getDatabaseConfig({ forTests = false } = {}) {
  const databaseName = forTests
    ? required("TEST_DB_NAME", process.env.TEST_DB_NAME)
    : required("DB_NAME", process.env.DB_NAME);

  if (forTests) {
    const developmentDatabase = required("DB_NAME", process.env.DB_NAME);
    if (databaseName.toLowerCase() === developmentDatabase.toLowerCase()) {
      throw new Error("TEST_DB_NAME must be different from DB_NAME to protect development data.");
    }
  }

  const port = Number(process.env.DB_PORT ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be a valid TCP port.");
  }

  const databaseUser = required("DB_USER", process.env.DB_USER);
  if (databaseUser.toLowerCase() === "root") {
    throw new Error("DB_USER must be an application account; MySQL root is not allowed.");
  }

  return {
    host: process.env.DB_HOST?.trim() || "localhost",
    port,
    database: databaseName,
    user: databaseUser,
    password: required("DB_PASSWORD", process.env.DB_PASSWORD),
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    charset: "utf8mb4",
    dateStrings: true,
  };
}

export function getConfig(options = {}) {
  const db = getDatabaseConfig(options);
  const appPort = Number(process.env.PORT ?? 5000);
  if (!Number.isInteger(appPort) || appPort < 1 || appPort > 65535) {
    throw new Error("PORT must be a valid TCP port.");
  }

  const jwtSecret = required("JWT_SECRET", process.env.JWT_SECRET);
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
  }

  return {
    db,
    jwtSecret,
    port: appPort,
    clientUrl: process.env.CLIENT_URL?.trim() || "http://localhost:3000",
    nodeEnv: process.env.NODE_ENV || "development",
  };
}
