import type { NextFunction, Request, Response } from "express";
import { AuthError, verifySupabaseJwt } from "../auth.js";
import type { AuthenticatedRequest } from "../types/auth.js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  try {
    (req as AuthenticatedRequest).userId = await verifySupabaseJwt(token);
    next();
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(401).json({ error: error.message });
      return;
    }

    res.status(401).json({ error: "Invalid or expired token" });
  }
}
