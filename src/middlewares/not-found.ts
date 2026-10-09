import type { RequestHandler } from 'express';
import { AppError } from '../utils/app-error.js';

export const notFound: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Not found: ${req.method} ${req.originalUrl}`));
};
