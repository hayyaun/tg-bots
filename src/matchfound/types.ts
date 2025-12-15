// Import and re-export UserProfile from shared for backward compatibility
import { UserProfile } from "../shared/types";
export { UserProfile };

export interface MatchUser extends UserProfile {
  age: number | null;
  match_priority: number; // 1 = both match, 2 = archetype only, 3 = MBTI only
  compatibility_score?: number; // Compatibility percentage (0-100)
}

export interface SessionData {
  matches?: MatchUser[];
  currentMatchIndex?: number;
  likedUsers?: MatchUser[];
  currentLikedIndex?: number;
  reportingUserId?: number;
  editingField?: "name" | "bio" | "birthdate" | "gender" | "looking_for" | "images" | "username" | "mood" | "interests" | "location";
  interestsPage?: number; // Current page for interests pagination (0-indexed)
  locationPage?: number; // Current page for location pagination (0-indexed)
  completingProfile?: boolean; // Whether user is in profile completion flow
  profileCompletionFieldIndex?: number; // Index of current field being completed
}

