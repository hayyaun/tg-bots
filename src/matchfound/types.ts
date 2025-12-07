export interface UserProfile {
  telegram_id: number;
  username: string | null;
  display_name: string | null;
  biography: string | null;
  birth_date: Date | null;
  gender: string | null;
  looking_for_gender: string | null;
  archetype_result: string | null;
  mbti_result: string | null;
  profile_image: string | null;
  mood: string | null;
  interests: string[] | null;
  location: string | null;
  completion_score: number;
  created_at: Date;
  updated_at: Date;
}

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

