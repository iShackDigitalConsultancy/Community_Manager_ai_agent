import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const reqId = req.headers['x-request-id'] || randomUUID();
  req.headers['x-request-id'] = reqId; // Ensure it's available downstream
  res.setHeader('x-request-id', reqId);
  next();
};
