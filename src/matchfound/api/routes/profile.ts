import express from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { updateCompletionScoreById } from "../../../shared/database";
import { prisma } from "../../../db";
import log from "../../../log";

const router = express.Router();

// All profile routes require authentication
// @ts-expect-error - Express 5 type compatibility
router.use(authenticateToken);

// Get user profile
// @ts-expect-error - Express 5 type compatibility
router.get("/", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Convert BigInt to string for JSON
    const profile = {
      id: user.id.toString(),
      telegram_id: user.telegram_id?.toString() || null,
      username: user.username,
      display_name: user.display_name,
      biography: user.biography,
      birth_date: user.birth_date,
      age: user.age,
      gender: user.gender,
      looking_for_gender: user.looking_for_gender,
      archetype_result: user.archetype_result,
      mbti_result: user.mbti_result,
      leftright_result: user.leftright_result,
      politicalcompass_result: user.politicalcompass_result,
      enneagram_result: user.enneagram_result,
      bigfive_result: user.bigfive_result,
      profile_image: user.profile_image,
      mood: user.mood,
      interests: user.interests,
      location: user.location,
      completion_score: user.completion_score,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.json(profile);
  } catch (error) {
    log.error("Get profile error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
// @ts-expect-error - Express 5 type compatibility
router.patch("/", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const allowedFields = [
      "username",
      "display_name",
      "biography",
      "age",
      "gender",
      "looking_for_gender",
      "mood",
      "interests",
      "location",
      "profile_image",
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "age" && req.body[field] !== null) {
          const age = parseInt(req.body[field], 10);
          if (isNaN(age) || age < 18 || age > 120) {
            res.status(400).json({ error: "Invalid age" });
            return;
          }
          updates[field] = age;
        } else if (field === "interests" && Array.isArray(req.body[field])) {
          updates[field] = req.body[field];
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: updates,
    });

    await updateCompletionScoreById(req.userId);

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    log.error("Update profile error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update quiz results (for mobile app users who complete quizzes)
// @ts-expect-error - Express 5 type compatibility
router.patch("/quiz-results", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const allowedFields = [
      "archetype_result",
      "mbti_result",
      "leftright_result",
      "politicalcompass_result",
      "enneagram_result",
      "bigfive_result",
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "mbti_result" && req.body[field]) {
          updates[field] = req.body[field].toUpperCase();
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid quiz result fields to update" });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: updates,
    });

    await updateCompletionScoreById(req.userId);

    res.json({ message: "Quiz results updated successfully" });
  } catch (error) {
    log.error("Update quiz results error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

