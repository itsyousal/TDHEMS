// src/lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super("VALIDATION_ERROR", 400, message, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super("UNAUTHORIZED", 401, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden") {
    super("FORBIDDEN", 403, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Not found") {
    super("NOT_FOUND", 404, message);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super("CONFLICT", 409, message, details);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = "Internal server error") {
    super("INTERNAL_SERVER_ERROR", 500, message);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
      details: { stack: error.stack },
    };
  }

  return {
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  };
}

export function createErrorResponse(error: unknown, status: number = 500) {
  const handled = handleApiError(error);
  return new Response(JSON.stringify(handled), {
    status: error instanceof ApiError ? error.status : status,
    headers: { "Content-Type": "application/json" },
  });
}
