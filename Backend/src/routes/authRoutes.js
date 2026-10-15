import { Router } from "express";

export function createAuthRoutes(controller, authenticate) {
  const router = Router();
  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.get("/me", authenticate, controller.me);
  return router;
}
