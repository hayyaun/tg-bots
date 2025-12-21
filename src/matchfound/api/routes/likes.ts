import express from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from "../../../db";
import log from "../../../log";
import {
  invalidateExclusionCache,
  invalidateExclusionCacheForUsers,
} from "../../cache/exclusionCache";
import {
  invalidateMatchCacheForUsers,
} from "../../cache/matchCache";

const router = express.Router();

// All likes routes require authentication
// @ts-expect-error - Express 5 type compatibility
router.use(authenticateToken);

// Like a user
// @ts-expect-error - Express 5 type compatibility
router.post("/:userId", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const likedUserId = BigInt(req.params.userId);

    if (req.userId === likedUserId) {
      res.status(400).json({ error: "Cannot like yourself" });
      return;
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        user_id_liked_user_id: {
          user_id: req.userId,
          liked_user_id: likedUserId,
        },
      },
    });

    if (existingLike) {
      res.status(400).json({ error: "User already liked" });
      return;
    }

    // Check if user exists
    const likedUser = await prisma.user.findUnique({
      where: { id: likedUserId },
    });

    if (!likedUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Create like
    await prisma.like.create({
      data: {
        user_id: req.userId,
        liked_user_id: likedUserId,
      },
    });

    // Invalidate exclusion cache and match cache for both users (affects their match queries)
    await invalidateExclusionCacheForUsers([req.userId, likedUserId]);
    await invalidateMatchCacheForUsers([req.userId, likedUserId]);

    // Check for mutual like (match)
    const mutualLike = await prisma.like.findUnique({
      where: {
        user_id_liked_user_id: {
          user_id: likedUserId,
          liked_user_id: req.userId,
        },
      },
    });

    res.json({
      message: "User liked successfully",
      isMatch: !!mutualLike,
    });
  } catch (error) {
    log.error("Like user error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Dislike/ignore a user
// @ts-expect-error - Express 5 type compatibility
router.delete("/:userId", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const dislikedUserId = BigInt(req.params.userId);

    if (req.userId === dislikedUserId) {
      res.status(400).json({ error: "Cannot dislike yourself" });
      return;
    }

    // Remove like if exists
    await prisma.like.deleteMany({
      where: {
        user_id: req.userId,
        liked_user_id: dislikedUserId,
      },
    });

    // Add to ignored
    await prisma.ignored.upsert({
      where: {
        user_id_ignored_user_id: {
          user_id: req.userId,
          ignored_user_id: dislikedUserId,
        },
      },
      create: {
        user_id: req.userId,
        ignored_user_id: dislikedUserId,
      },
      update: {},
    });

    // Invalidate exclusion cache and match cache for both users (affects their match queries)
    await invalidateExclusionCacheForUsers([req.userId, dislikedUserId]);
    await invalidateMatchCacheForUsers([req.userId, dislikedUserId]);

    res.json({ message: "User disliked successfully" });
  } catch (error) {
    log.error("Dislike user error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get users who liked me
// @ts-expect-error - Express 5 type compatibility
router.get("/received", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const likes = await prisma.like.findMany({
      where: { liked_user_id: req.userId },
      include: {
        user: {
          select: {
            id: true,
            telegram_id: true,
            username: true,
            display_name: true,
            profile_image: true,
            biography: true,
            age: true,
            gender: true,
            interests: true,
            location: true,
            archetype_result: true,
            mbti_result: true,
            completion_score: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const formattedLikes = likes.map((like) => ({
      id: like.user.id.toString(),
      telegram_id: like.user.telegram_id?.toString() || null,
      username: like.user.username,
      display_name: like.user.display_name,
      profile_image: like.user.profile_image,
      biography: like.user.biography,
      age: like.user.age,
      gender: like.user.gender,
      interests: like.user.interests,
      location: like.user.location,
      archetype_result: like.user.archetype_result,
      mbti_result: like.user.mbti_result,
      completion_score: like.user.completion_score,
      liked_at: like.created_at.toISOString(),
    }));

    res.json({ likes: formattedLikes });
  } catch (error) {
    log.error("Get received likes error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get users I liked
// @ts-expect-error - Express 5 type compatibility
router.get("/sent", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const likes = await prisma.like.findMany({
      where: { user_id: req.userId },
      include: {
        likedUser: {
          select: {
            id: true,
            telegram_id: true,
            username: true,
            display_name: true,
            profile_image: true,
            biography: true,
            age: true,
            gender: true,
            interests: true,
            location: true,
            archetype_result: true,
            mbti_result: true,
            completion_score: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const formattedLikes = likes.map((like) => ({
      id: like.likedUser.id.toString(),
      telegram_id: like.likedUser.telegram_id?.toString() || null,
      username: like.likedUser.username,
      display_name: like.likedUser.display_name,
      profile_image: like.likedUser.profile_image,
      biography: like.likedUser.biography,
      age: like.likedUser.age,
      gender: like.likedUser.gender,
      interests: like.likedUser.interests,
      location: like.likedUser.location,
      archetype_result: like.likedUser.archetype_result,
      mbti_result: like.likedUser.mbti_result,
      completion_score: like.likedUser.completion_score,
      liked_at: like.created_at.toISOString(),
    }));

    res.json({ likes: formattedLikes });
  } catch (error) {
    log.error("Get sent likes error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

