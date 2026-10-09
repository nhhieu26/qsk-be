import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler<P, ResBody, ReqBody, ReqQuery> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>,
>(fn: AsyncRequestHandler<P, ResBody, ReqBody, ReqQuery>): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
