import express from "express";
import passport from "passport";
import { generateToken } from "../middleware/auth";
import log from "../../../log";

const router = express.Router();

// Initialize Google OAuth
import "../auth/google";

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.redirect(`${process.env.MATCHFOUND_MOBILE_APP_REDIRECT_URL || "http://localhost:3000"}/auth/error`);
      }

      const token = generateToken(user.id);
      const redirectUrl = `${process.env.MATCHFOUND_MOBILE_APP_REDIRECT_URL || "http://localhost:3000"}/auth/callback?token=${token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      log.error("OAuth callback error", error);
      res.redirect(`${process.env.MATCHFOUND_MOBILE_APP_REDIRECT_URL || "http://localhost:3000"}/auth/error`);
    }
  }
);

// Get current user info (for verifying token)
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { verifyToken } = await import("../middleware/auth");
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    const { prisma } = await import("../../../db");
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        telegram_id: true,
        google_id: true,
        email: true,
        username: true,
        display_name: true,
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id.toString(),
      telegram_id: user.telegram_id?.toString() || null,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      created_at: user.created_at,
    });
  } catch (error) {
    log.error("Auth me error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

