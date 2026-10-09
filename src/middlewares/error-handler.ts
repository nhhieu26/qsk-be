import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { sendError } from '../utils/api-response.js';

const DUPLICATE_KEY_CODE = 11000;

/** Đổi lỗi mongoose/Mongo thường gặp sang AppError 4xx thay vì rơi thành 500. */
function normalizeError(err: unknown): unknown {
  if (err instanceof mongoose.Error.CastError) {
    return AppError.notFound('Không tìm thấy dữ liệu');
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([path, e]) => [path, [e.message]]),
    );
    return AppError.badRequest('Dữ liệu không hợp lệ', details);
  }
  if (err instanceof Error && 'code' in err && err.code === DUPLICATE_KEY_CODE) {
    return AppError.conflict('Dữ liệu bị trùng');
  }
  return err;
}

export const errorHandler: ErrorRequestHandler = (rawErr, _req, res, _next) => {
  const err = normalizeError(rawErr);
  const status: number = err instanceof AppError ? err.status : rawErr.status || rawErr.statusCode || 500;
  if (status >= 500) console.error(rawErr);
  const message = status >= 500 && env.NODE_ENV === 'production' ? 'Internal server error' : (err as Error).message;
  sendError(res, status, message, err instanceof AppError ? err.details : undefined);
};
