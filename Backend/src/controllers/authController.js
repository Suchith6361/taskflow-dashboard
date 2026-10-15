import { parse } from "../utils/validation.js";
import { loginSchema, registerSchema } from "../validators/schemas.js";

export function createAuthController(authService) {
  return {
    register: async (req, res) => {
      const input = parse(registerSchema, req.body);
      const result = await authService.register(input);
      res.status(201).json({ success: true, data: result });
    },
    login: async (req, res) => {
      const input = parse(loginSchema, req.body);
      const result = await authService.login(input);
      res.json({ success: true, data: result });
    },
    me: async (req, res) => {
      const user = await authService.getCurrentUser(req.user.id);
      res.json({ success: true, data: { user } });
    },
  };
}
