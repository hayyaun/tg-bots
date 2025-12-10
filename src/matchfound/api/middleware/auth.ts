import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../../db";

export interface AuthRequest extends Request {
  userId?: bigint;
  user?: {
    id: bigint;
    telegram_id: bigint | null;
    google_id: string | null;
    email: string | null;
  };
}

const JWT_SECRET = process.env.MATCHFOUND_JWT_SECRET || "your-secret-key-change-in-production";

export function generateToken(userId: bigint): string {
  return jwt.sign({ userId: userId.toString() }, JWT_SECRET, {
    expiresIn: "30d",
  });
}

export function verifyToken(token: string): { userId: bigint } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return { userId: BigInt(decoded.userId) };
  } catch (error) {
    return null;
  }
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(403).json({ error: "Invalid or expired token" });
    return;
  }

  // Verify user still exists
  prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      telegram_id: true,
      google_id: true,
      email: true,
    },
  }).then((user) => {
    if (!user) {
      res.status(403).json({ error: "User not found" });
      return;
    }

    req.userId = user.id;
    req.user = user;
    next();
  }).catch(() => {
    res.status(500).json({ error: "Internal server error" });
  });
}

