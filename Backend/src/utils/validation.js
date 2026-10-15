import { ApiError } from "./ApiError.js";

export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new ApiError(400, "VALIDATION_ERROR", "The request contains invalid input.");
    error.details = result.error.issues.map(({ path, message }) => ({
      field: path.join("."),
      message,
    }));
    throw error;
  }
  return result.data;
}
