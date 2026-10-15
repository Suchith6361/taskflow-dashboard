import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

export function notFoundHandler(req, res, next) {
  next(new ApiError(404, "NOT_FOUND", "The requested endpoint was not found."));
}

export function errorHandler(error, req, res, _next) {
  if (res.headersSent) return;

  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "An unexpected error occurred.";
  let details;

  if (error instanceof ApiError) {
    ({ status, code, message, details } = error);
  } else if (error instanceof ZodError) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "The request contains invalid input.";
    details = error.issues.map(({ path, message: issueMessage }) => ({
      field: path.join("."),
      message: issueMessage,
    }));
  } else if (error?.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "Request body must contain valid JSON.";
  } else if (error?.code === "ER_DUP_ENTRY") {
    status = 409;
    code = "CONFLICT";
    message = "A record with those details already exists.";
  }

  if (status >= 500) {
    req.log?.error?.({ errorName: error?.name ?? "Error", code: error?.code });
  }

  res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}
