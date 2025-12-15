// Bot name constants - imported from respective bot modules
export { BOT_NAME as MATCHFOUND_BOT_NAME } from "../matchfound/constants";

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

// Re-export interest names from i18n (Persian default for backward compatibility)
// Use getInterestNames() from i18n for language-aware interest names
export { getInterestName } from "./i18n";
import { getInterestName } from "./i18n";
import { Language } from "./types";

// Interest display names (Persian) - kept for backward compatibility
// Prefer using getInterestNames() for i18n support
export const INTEREST_NAMES: Record<Interest, string> = Object.fromEntries(
  INTERESTS.map((interest) => [interest, getInterestName(interest, Language.Persian)])
) as Record<Interest, string>;

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

export type IranProvince = typeof IRAN_PROVINCES[number];

// Province display names (Persian)
export const PROVINCE_NAMES: Record<IranProvince, string> = {
  tehran: "تهران",
  isfahan: "اصفهان",
  fars: "فارس",
  khuzestan: "خوزستان",
  east_azerbaijan: "آذربایجان شرقی",
  mazandaran: "مازندران",
  khorasan_razavi: "خراسان رضوی",
  alborz: "البرز",
  gilan: "گیلان",
  kerman: "کرمان",
  west_azerbaijan: "آذربایجان غربی",
  semnan: "سمنان",
  qom: "قم",
  golestan: "گلستان",
  kurdistan: "کردستان",
  yazd: "یزد",
  ardabil: "اردبیل",
  kermanshah: "کرمانشاه",
  hormozgan: "هرمزگان",
  markazi: "مرکزی",
  hamadan: "همدان",
  lorestan: "لرستان",
  khorasan_south: "خراسان جنوبی",
  zanjan: "زنجان",
  khorasan_north: "خراسان شمالی",
  qazvin: "قزوین",
  chaharmahal_bakhtiari: "چهارمحال و بختیاری",
  bushehr: "بوشهر",
  kohgiluyeh_boyer_ahmad: "کهگیلویه و بویراحمد",
  ilam: "ایلام",
  sistan_baluchestan: "سیستان و بلوچستان",
};
