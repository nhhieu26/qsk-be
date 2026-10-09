export class AppError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new AppError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(403, message);
  }

  static notFound(message = 'Not found') {
    return new AppError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new AppError(409, message);
  }

  static internal(message = 'Internal server error') {
    return new AppError(500, message);
  }
}
