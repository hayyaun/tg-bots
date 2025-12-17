import { UserProfile } from "../shared/types";
import { BaseSessionData } from "../shared/session";

export interface MatchUser extends UserProfile {
  age: number | null;
  match_priority: number; // 1 = both match, 2 = archetype only, 3 = MBTI only
  compatibility_score?: number; // Compatibility percentage (0-100)
  mutual_interests_count?: number; // Number of mutual interests (pre-computed for sorting)
}

// Lightweight metadata stored in session (instead of full MatchUser objects)
export interface MatchMetadata {
  match_priority: number;
  compatibility_score?: number;
}

export type DisplayMode = "match" | "liked";

export interface SessionData extends BaseSessionData {
  // Store only IDs and metadata instead of full MatchUser arrays
  // This reduces memory usage by ~90% for large match lists
  matchIds?: number[]; // Array of telegram_ids in display order
  matchMetadata?: Record<number, MatchMetadata>; // Metadata by telegram_id
  currentMatchIndex?: number;
  likedUserIds?: number[]; // Array of telegram_ids in display order
  currentLikedIndex?: number;
  reportingUserId?: number;
  banningUserId?: number; // User being banned (telegram_id)
  profileCompletionFieldIndex?: number; // Index of current field being completed
}

