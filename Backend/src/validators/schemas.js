import { z } from "zod";

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const name = z.string().trim().min(2).max(100);
const password = z.string().min(8).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Must be at most 72 UTF-8 bytes");
const description = z.string().trim().max(2000).nullable().optional();
const dueDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Must be a valid calendar date")
  .nullable()
  .optional();

export const registerSchema = z.object({ name, email, password });
export const loginSchema = z.object({ email, password });
export const projectSchema = z.object({ name, description });
export const taskCreateSchema = z.object({
  projectId: z.coerce.number().int().positive().safe(),
  title: z.string().trim().min(1).max(200),
  description,
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate,
});
export const taskUpdateSchema = z.object({
  projectId: z.coerce.number().int().positive().safe(),
  title: z.string().trim().min(1).max(200),
  description,
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate,
});
export const taskStatusSchema = z.object({ status: z.enum(["todo", "in_progress", "done"]) });
export const idSchema = z.coerce.number().int().positive().safe();
export const taskFiltersSchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
