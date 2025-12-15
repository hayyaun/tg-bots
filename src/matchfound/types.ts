import { UserProfile } from "../shared/types";
import { BaseSessionData } from "../shared/session";

export interface MatchUser extends UserProfile {
  age: number | null;
  match_priority: number; // 1 = both match, 2 = archetype only, 3 = MBTI only
  compatibility_score?: number; // Compatibility percentage (0-100)
}

export interface SessionData extends BaseSessionData {
  matches?: MatchUser[];
  currentMatchIndex?: number;
  likedUsers?: MatchUser[];
  currentLikedIndex?: number;
  reportingUserId?: number;
  profileCompletionFieldIndex?: number; // Index of current field being completed
}

