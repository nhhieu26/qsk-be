import type { RequestHandler } from 'express';
import { sendSuccess } from '../../utils/api-response.js';

const check: RequestHandler = (_req, res) => {
  sendSuccess(res, { status: 'ok', uptime: process.uptime() });
};

export const healthController = { check };
