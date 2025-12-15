/**
 * IMPORTANT: This is a shared module used by all bots.
 * NEVER import anything from bot-specific modules (e.g., matchfound, inmankist, etc.) into this file.
 * Shared modules should only depend on other shared modules or external dependencies.
 * This ensures proper separation of concerns and prevents circular dependencies.
 */

// Inmankist bot username (for quiz completion links)
export const INMANKIST_BOT_USERNAME = process.env.INMANKIST_BOT_USERNAME || "inmankist_bot";

// Profile completion
export const MAX_COMPLETION_SCORE = 12;

// Mood emojis for profile mood feature
export const MOODS: Record<string, string> = {
  happy: "😊",
  sad: "😢",
  tired: "😴",
  cool: "😎",
  thinking: "🤔",
  excited: "😍",
  calm: "😌",
  angry: "😤",
  neutral: "😐",
  playful: "😋",
};

// Shared limits and pagination
export const MIN_INTERESTS = 5;
export const MAX_INTERESTS = 15;
export const MIN_AGE = 18;
export const MAX_AGE = 120;
export const MAX_DISPLAY_NAME_LENGTH = 100;
export const ITEMS_PER_PAGE = 20;

// Available interests keywords (curated list of most common and distinct interests)
export const INTERESTS = [
  // Animals & Pets
  "cat", "dog", "bird", "fish",
  // Sports & Fitness
  "football", "basketball", "tennis", "swimming", "running", "cycling", "boxing", "martial_arts", "golf", "skiing", "surfing", "skateboarding", "climbing", "hiking", "camping", "fitness", "yoga", "meditation",
  // Music
  "music", "rock", "pop", "jazz", "classical", "electronic", "hip_hop", "kpop", "guitar", "piano", "singing", "concerts",
  // Entertainment & Media
  "movie", "tv_shows", "anime", "manga", "comics", "books", "theater", "dancing", "gaming", "podcasts", "youtube",
  // Technology
  "technology", "programming", "ai", "photography", "graphic_design",
  // Food & Drink
  "cooking", "wine", "coffee", "tea", "vegetarian", "vegan", "sushi", "pizza",
  // Travel & Adventure
  "traveling", "history", "culture", "adventure",
  // Arts & Crafts
  "art", "painting", "drawing",
  // Fashion & Beauty
  "fashion", "makeup", "jewelry", "shopping", "vintage",
  // Education & Learning
  "education", "science", "languages",
  // Nature & Outdoors
  "nature", "gardening",
  // Vehicles
  "cars", "bicycles",
  // Hobbies & Games
  "board_games", "chess",
  // Social & Community
  "volunteering", "events", "festivals",
  // Business
  "business",
  // Spiritual & Religious
  "spirituality", "religion",
  // Communication & Media
  "content_creation", "social_media",
] as const;

export type Interest = typeof INTERESTS[number];

// Iran provinces list (31 provinces)
export const IRAN_PROVINCES = [
  "tehran",
  "isfahan",
  "fars",
  "khuzestan",
  "east_azerbaijan",
  "mazandaran",
  "khorasan_razavi",
  "alborz",
  "gilan",
  "kerman",
  "west_azerbaijan",
  "semnan",
  "qom",
  "golestan",
  "kurdistan",
  "yazd",
  "ardabil",
  "kermanshah",
  "hormozgan",
  "markazi",
  "hamadan",
  "lorestan",
  "khorasan_south",
  "zanjan",
  "khorasan_north",
  "qazvin",
  "chaharmahal_bakhtiari",
  "bushehr",
  "kohgiluyeh_boyer_ahmad",
  "ilam",
  "sistan_baluchestan",
] as const;

// Field key constants (used directly as database field names and editingField values)
// These match the UserProfile interface field names
export const FIELD_KEY = {
  USERNAME: "username",
  DISPLAY_NAME: "display_name",
  BIOGRAPHY: "biography",
  BIRTH_DATE: "birth_date",
  GENDER: "gender",
  LOOKING_FOR_GENDER: "looking_for_gender",
  PROFILE_IMAGE: "profile_image",
  MOOD: "mood",
  INTERESTS: "interests",
  LOCATION: "location",
} as const;

// Type for editing field (now just uses field keys directly)
export type ProfileFieldKey = typeof FIELD_KEY[keyof typeof FIELD_KEY];
