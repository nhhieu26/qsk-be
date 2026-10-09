import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../utils/app-error.js";

const INVALID_MESSAGE = "Dữ liệu không hợp lệ";

/**
 * Lỗi theo field, key là đường dẫn đầy đủ (`shipping.recipient.phone`) để
 * frontend gắn đúng ô. Message chính là lỗi đầu tiên cho người dùng đọc được.
 */
function toBadRequest(error: z.ZodError) {
  const details = error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.join(".") || "_";
    return { ...acc, [key]: [...(acc[key] ?? []), issue.message] };
  }, {});
  return AppError.badRequest(error.issues[0]?.message ?? INVALID_MESSAGE, details);
}

export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return next(toBadRequest(result.error));
    }
    req.body = result.data;
    next();
  };
}

/**
 * Express 5 để `req.query` là getter chỉ đọc, nên ghi đè bằng
 * `defineProperty` để controller đọc được giá trị đã parse/ép kiểu.
 * Đồng thời gắn vào `res.locals.query` cho các controller đọc từ đó.
 */
export function validateQuery(schema: z.ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(toBadRequest(result.error));
    }
    Object.defineProperty(req, "query", {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    res.locals.query = result.data;
    next();
  };
}
