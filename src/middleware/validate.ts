import fs from "node:fs/promises";
import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

// If multer already saved an uploaded file to disk before validation ran,
// a rejected request must not leave that temp file orphaned in uploads/.
function cleanupUploadedFile(req: Request) {
  if (req.file) {
    void fs.unlink(req.file.path).catch(() => {});
  }
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      cleanupUploadedFile(req);
      return res.status(400).json({ error: "Validation failed", details: result.error.flatten() });
    }

    req.body = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      cleanupUploadedFile(req);
      return res.status(400).json({ error: "Validation failed", details: result.error.flatten() });
    }

    req.params = result.data as typeof req.params;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({ error: "Validation failed", details: result.error.flatten() });
    }

    // req.query is a getter-only accessor in Express 5 that re-parses the
    // query string on every access, so mutating the returned object (or
    // reassigning req.query directly) is silently lost. Overriding the
    // property itself is the supported way to persist parsed data on it.
    Object.defineProperty(req, "query", {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}
