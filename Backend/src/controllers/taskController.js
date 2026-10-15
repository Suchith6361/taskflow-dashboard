import { parse } from "../utils/validation.js";
import { idSchema, taskCreateSchema, taskFiltersSchema, taskStatusSchema, taskUpdateSchema } from "../validators/schemas.js";

export function createTaskController(taskService) {
  return {
    list: async (req, res) => {
      const filters = parse(taskFiltersSchema, req.query);
      const result = await taskService.list(req.user.id, filters);
      res.json({
        success: true,
        data: result.tasks,
        meta: { pagination: result.pagination },
      });
    },
    get: async (req, res) => {
      const task = await taskService.get(req.user.id, parse(idSchema, req.params.id));
      res.json({ success: true, data: { task } });
    },
    create: async (req, res) => {
      const input = parse(taskCreateSchema, req.body);
      const task = await taskService.create(req.user.id, input);
      res.status(201).json({ success: true, data: { task } });
    },
    update: async (req, res) => {
      const id = parse(idSchema, req.params.id);
      const input = parse(taskUpdateSchema, req.body);
      const task = await taskService.update(req.user.id, id, input);
      res.json({ success: true, data: { task } });
    },
    updateStatus: async (req, res) => {
      const id = parse(idSchema, req.params.id);
      const { status } = parse(taskStatusSchema, req.body);
      const task = await taskService.updateStatus(req.user.id, id, status);
      res.json({ success: true, data: { task } });
    },
    remove: async (req, res) => {
      await taskService.remove(req.user.id, parse(idSchema, req.params.id));
      res.json({ success: true, data: { deleted: true } });
    },
  };
}
