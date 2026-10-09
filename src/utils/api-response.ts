import type { Response } from 'express';

export interface SuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: true;
  message?: string;
  data: T[];
  pagination: Pagination;
}

export interface ErrorResponse {
  success: false;
  message: string;
  details?: unknown;
}

export function buildPagination(page: number, limit: number, total: number): Pagination {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

export function sendSuccess<T>(res: Response, data: T, options: { status?: number; message?: string } = {}) {
  const { status = 200, message } = options;
  const body: SuccessResponse<T> = { success: true, ...(message && { message }), data };
  return res.status(status).json(body);
}

export function sendCreated<T>(res: Response, data: T, message?: string) {
  return sendSuccess(res, data, { status: 201, message });
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  meta: { page: number; limit: number; total: number },
  message?: string,
) {
  const body: PaginatedResponse<T> = {
    success: true,
    ...(message && { message }),
    data: items,
    pagination: buildPagination(meta.page, meta.limit, meta.total),
  };
  return res.status(200).json(body);
}

export function sendError(res: Response, status: number, message: string, details?: unknown) {
  const body: ErrorResponse = { success: false, message, ...(details !== undefined && { details }) };
  return res.status(status).json(body);
}
