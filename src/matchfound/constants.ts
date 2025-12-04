// Archetype compatibility matrix (from COMPLEMENTARY_MATRIX.md)
export const archetypeCompatibility: Record<string, string[]> = {
  // Goddesses
  hera: ["zeus", "apollo"],
  demeter: ["zeus", "hades"],
  persephone: ["hades", "hermes"],
  artemis: ["ares", "hermes"],
  athena: ["zeus", "hephaestus"],
  aphrodite: ["ares", "hermes"],
  hestia: ["hephaestus", "poseidon"],
  
  // Gods
  zeus: ["hera", "aphrodite"],
  hades: ["persephone", "hestia"],
  apollo: ["athena", "aphrodite"],
  ares: ["aphrodite", "artemis"],
  dionysus: ["persephone", "aphrodite"],
  hermes: ["athena", "aphrodite"],
  hephaestus: ["hestia", "aphrodite"],
  poseidon: ["persephone", "demeter"],
};

// MBTI compatibility matrix (from COMPLEMENTARY_MATRIX.md)
export const mbtiCompatibility: Record<string, string[]> = {
  ENFP: ["INTJ", "INFJ", "ISFJ"],
  ENTP: ["INFJ", "INTJ", "ISFJ"],
  ENFJ: ["INFP", "INTP", "ISFP"],
  ENTJ: ["INFP", "ISFP", "INTP"],
  INFP: ["ENTJ", "ENFJ", "ESTJ"],
  INTP: ["ENTJ", "ENFJ", "ESFJ"],
  INFJ: ["ENTP", "ENFP", "ESTP"],
  INTJ: ["ENFP", "ENTP", "ESFP"],
  ISFP: ["ENTJ", "ENFJ", "ESTJ"],
  ISFJ: ["ENFP", "ENTP", "ESFP"],
  ISTP: ["ESFJ", "ESTJ", "ENFJ"],
  ISTJ: ["ESFP", "ESTP", "ENFP"],
  ESFP: ["ISTJ", "ISFJ", "INTJ"],
  ESFJ: ["ISTP", "ISFP", "INTP"],
  ESTP: ["ISFJ", "ISTJ", "INFJ"],
  ESTJ: ["ISFP", "INFP", "ISTP"],
};

export const BOT_NAME = "MatchFound";

// Inmankist bot username (for quiz completion links)
export const INMANKIST_BOT_USERNAME = process.env.INMANKIST_BOT_USERNAME || "inmankist_bot";

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

// Interest display names (Persian)
export const INTEREST_NAMES: Record<Interest, string> = {
  // Animals & Pets
  cat: "گربه",
  dog: "سگ",
  bird: "پرنده",
  fish: "ماهی",
  // Sports & Fitness
  football: "فوتبال",
  basketball: "بسکتبال",
  tennis: "تنیس",
  swimming: "شنا",
  running: "دویدن",
  cycling: "دوچرخه‌سواری",
  boxing: "بوکس",
  martial_arts: "هنرهای رزمی",
  golf: "گلف",
  skiing: "اسکی",
  surfing: "موج‌سواری",
  skateboarding: "اسکیت‌بورد",
  climbing: "صخره‌نوردی",
  hiking: "کوهنوردی",
  camping: "کمپینگ",
  fitness: "تناسب اندام",
  yoga: "یوگا",
  meditation: "مدیتیشن",
  // Music
  music: "موسیقی",
  rock: "راک",
  pop: "پاپ",
  jazz: "جاز",
  classical: "کلاسیک",
  electronic: "الکترونیک",
  hip_hop: "هیپ‌هاپ",
  kpop: "کی‌پاپ",
  guitar: "گیتار",
  piano: "پیانو",
  singing: "آواز",
  concerts: "کنسرت",
  // Entertainment & Media
  movie: "فیلم",
  tv_shows: "سریال",
  anime: "انیمه",
  manga: "مانگا",
  comics: "کمیک",
  books: "کتاب",
  theater: "تئاتر",
  dancing: "رقص",
  gaming: "بازی",
  podcasts: "پادکست",
  youtube: "یوتیوب",
  // Technology
  technology: "تکنولوژی",
  programming: "برنامه‌نویسی",
  ai: "هوش مصنوعی",
  photography: "عکاسی",
  graphic_design: "طراحی گرافیک",
  // Food & Drink
  cooking: "آشپزی",
  wine: "شراب",
  coffee: "قهوه",
  tea: "چای",
  vegetarian: "گیاهخواری",
  vegan: "وگان",
  sushi: "سوشی",
  pizza: "پیتزا",
  // Travel & Adventure
  traveling: "سفر",
  history: "تاریخ",
  culture: "فرهنگ",
  adventure: "ماجراجویی",
  // Arts & Crafts
  art: "هنر",
  painting: "نقاشی",
  drawing: "طراحی",
  // Fashion & Beauty
  fashion: "مد",
  makeup: "آرایش",
  jewelry: "جواهرات",
  shopping: "خرید",
  vintage: "وینتیج",
  // Education & Learning
  education: "آموزش",
  science: "علم",
  languages: "زبان‌ها",
  // Nature & Outdoors
  nature: "طبیعت",
  gardening: "باغبانی",
  // Vehicles
  cars: "ماشین",
  bicycles: "دوچرخه",
  // Hobbies & Games
  board_games: "بازی رومیزی",
  chess: "شطرنج",
  // Social & Community
  volunteering: "داوطلب",
  events: "رویداد",
  festivals: "جشنواره",
  // Business
  business: "کسب و کار",
  // Spiritual & Religious
  spirituality: "معنویت",
  religion: "دین",
  // Communication & Media
  content_creation: "تولید محتوا",
  social_media: "شبکه‌های اجتماعی",
};
