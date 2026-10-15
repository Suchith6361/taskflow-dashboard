import { Router } from "express";

export function createDashboardRoutes(controller, authenticate) {
  const router = Router();
  router.get("/stats", authenticate, controller.stats);
  return router;
}
