import express from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from "../../../db";
import log from "../../../log";

const router = express.Router();

// All telegram routes require authentication
// @ts-expect-error - Express 5 type compatibility
router.use(authenticateToken);

// Connect Telegram account to mobile user
// @ts-expect-error - Express 5 type compatibility
router.post("/connect", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { telegram_id } = req.body;

    if (!telegram_id) {
      res.status(400).json({ error: "telegram_id is required" });
      return;
    }

    const telegramId = BigInt(telegram_id);

    // Check if telegram_id is already connected to another user
    const existingUser = await prisma.user.findUnique({
      where: { telegram_id: telegramId },
    });

    if (existingUser && existingUser.id !== req.userId) {
      res.status(400).json({ error: "This Telegram account is already connected to another user" });
      return;
    }

    // Check if current user already has a telegram_id
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { telegram_id: true },
    });

    if (currentUser?.telegram_id && currentUser.telegram_id !== telegramId) {
      res.status(400).json({ error: "Your account is already connected to a different Telegram account" });
      return;
    }

    // Connect telegram account
    await prisma.user.update({
      where: { id: req.userId },
      data: { telegram_id: telegramId },
    });

    res.json({ message: "Telegram account connected successfully" });
  } catch (error) {
    log.error("Connect Telegram error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Disconnect Telegram account
// @ts-expect-error - Express 5 type compatibility
router.post("/disconnect", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { telegram_id: null },
    });

    res.json({ message: "Telegram account disconnected successfully" });
  } catch (error) {
    log.error("Disconnect Telegram error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Telegram connection status
// @ts-expect-error - Express 5 type compatibility
router.get("/status", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { telegram_id: true },
    });

    res.json({
      connected: !!user?.telegram_id,
      telegram_id: user?.telegram_id?.toString() || null,
    });
  } catch (error) {
    log.error("Get Telegram status error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

