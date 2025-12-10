import express from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { findMatches } from "../../matching";
import log from "../../../log";

const router = express.Router();

// All matches routes require authentication
// @ts-expect-error - Express 5 type compatibility
router.use(authenticateToken);

// Get matches
// @ts-expect-error - Express 5 type compatibility
router.get("/", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const matches = await findMatches(Number(req.userId));

    // Convert BigInt to string for JSON
    const formattedMatches = matches.map((match) => ({
      ...match,
      id: match.telegram_id?.toString() || "", // For backward compatibility, using telegram_id as id
      telegram_id: match.telegram_id,
      birth_date: match.birth_date?.toISOString() || null,
      created_at: match.created_at.toISOString(),
      updated_at: match.updated_at.toISOString(),
    }));

    res.json({ matches: formattedMatches });
  } catch (error) {
    log.error("Get matches error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

