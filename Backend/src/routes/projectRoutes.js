import { Router } from "express";

export function createProjectRoutes(controller, authenticate) {
  const router = Router();
  router.use(authenticate);
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id", controller.get);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.remove);
  return router;
}
