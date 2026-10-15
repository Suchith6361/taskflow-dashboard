import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createAuthController } from "./controllers/authController.js";
import { createDashboardController } from "./controllers/dashboardController.js";
import { createProjectController } from "./controllers/projectController.js";
import { createTaskController } from "./controllers/taskController.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createAuthService } from "./services/authService.js";
import { createDashboardService } from "./services/dashboardService.js";
import { createProjectService } from "./services/projectService.js";
import { createTaskService } from "./services/taskService.js";
import { createAuthRoutes } from "./routes/authRoutes.js";
import { createDashboardRoutes } from "./routes/dashboardRoutes.js";
import { createProjectRoutes } from "./routes/projectRoutes.js";
import { createTaskRoutes } from "./routes/taskRoutes.js";

export function createApp({ pool, config, logger = console, authLimit = 10 }) {
  if (!pool || !config?.jwtSecret || !config?.clientUrl || !config?.nodeEnv) {
    throw new Error("createApp requires a database pool and validated application config.");
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.clientUrl }));
  app.use(express.json({ limit: "32kb" }));
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      logger.info?.(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    req.log = logger;
    next();
  });

  const authenticate = createAuthMiddleware(config.jwtSecret);
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authLimit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, error: { code: "RATE_LIMITED", message: "Too many authentication attempts. Try again later." } },
  });

  app.get("/api/health", async (_req, res) => {
    try {
      await pool.execute("SELECT 1");
      res.json({ success: true, data: { status: "ok", database: "connected" } });
    } catch (error) {
      logger.error?.({ errorName: error?.name ?? "Error", code: error?.code, message: "Health check database query failed." });
      res.status(503).json({
        success: false,
        error: { code: "DATABASE_UNAVAILABLE", message: "The database connection is unavailable." },
      });
    }
  });

  app.use("/api/auth", authLimiter, createAuthRoutes(createAuthController(createAuthService(pool, config.jwtSecret)), authenticate));
  app.use("/api/projects", createProjectRoutes(createProjectController(createProjectService(pool)), authenticate));
  app.use("/api/tasks", createTaskRoutes(createTaskController(createTaskService(pool)), authenticate));
  app.use("/api/dashboard", createDashboardRoutes(createDashboardController(createDashboardService(pool)), authenticate));
  app.use(notFoundHandler);
  app.use(errorHandler);
  app.locals.pool = pool;
  app.locals.environment = config.nodeEnv;
  return app;
}
