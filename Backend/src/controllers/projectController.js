import { parse } from "../utils/validation.js";
import { idSchema, projectSchema } from "../validators/schemas.js";

export function createProjectController(projectService) {
  return {
    list: async (req, res) => {
      const projects = await projectService.list(req.user.id);
      res.json({ success: true, data: projects });
    },
    get: async (req, res) => {
      const project = await projectService.get(req.user.id, parse(idSchema, req.params.id));
      res.json({ success: true, data: { project } });
    },
    create: async (req, res) => {
      const input = parse(projectSchema, req.body);
      const project = await projectService.create(req.user.id, input);
      res.status(201).json({ success: true, data: { project } });
    },
    update: async (req, res) => {
      const id = parse(idSchema, req.params.id);
      const input = parse(projectSchema, req.body);
      const project = await projectService.update(req.user.id, id, input);
      res.json({ success: true, data: { project } });
    },
    remove: async (req, res) => {
      await projectService.remove(req.user.id, parse(idSchema, req.params.id));
      res.json({ success: true, data: { deleted: true } });
    },
  };
}
