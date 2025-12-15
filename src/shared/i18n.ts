import { getWithPrefix, setWithPrefix } from "../redis";
import { INTERESTS, type Interest, IRAN_PROVINCES } from "./constants";
import { Language } from "./types";
import { BOT_NAME as MATCHFOUND_BOT_NAME } from "../matchfound/constants";

export type IranProvince = typeof IRAN_PROVINCES[number];

// Default language
export const DEFAULT_LANGUAGE = Language.Persian;

// Shared Redis prefix for user language (shared across all bots)
const SHARED_PREFIX = "shared";
const USER_LANG_TTL = 14 * 24 * 60 * 60; // 2 weeks in seconds

/**
 * Get user language (shared across all bots)
 */
export async function getUserLanguage(userId?: number): Promise<Language> {
  if (!userId) return DEFAULT_LANGUAGE;
  const lang = await getWithPrefix(SHARED_PREFIX, `user:${userId}:lang`);
  return (lang as Language) || DEFAULT_LANGUAGE;
}

/**
 * Set user language (shared across all bots)
 */
export async function setUserLanguage(
  userId: number,
  language: Language
): Promise<void> {
  await setWithPrefix(
    SHARED_PREFIX,
    `user:${userId}:lang`,
    language,
    USER_LANG_TTL
  );
}

/**
 * Check if user has set a language (vs using default)
 */
export async function hasUserLanguage(userId: number): Promise<boolean> {
  const lang = await getWithPrefix(SHARED_PREFIX, `user:${userId}:lang`);
  return lang !== null;
}

/**
 * Refresh language TTL (call when user interacts with bot)
 */
export async function refreshUserLanguageTTL(userId: number): Promise<void> {
  const lang = await getUserLanguage(userId);
  if (lang !== DEFAULT_LANGUAGE) {
    await setWithPrefix(
      SHARED_PREFIX,
      `user:${userId}:lang`,
      lang,
      USER_LANG_TTL
    );
  }
}

// Shared strings interface
export interface ISharedStrings {
  profileError: string;
  startFirst: string;
  registered: string; // "ثبت شده"
  // Profile fields
  profileTitle: string;
  name: string;
  age: string;
  genderLabel: string;
  lookingFor: string;
  biography: string;
  archetype: string;
  mbti: string;
  leftright: string;
  politicalcompass: string;
  enneagram: string;
  bigfive: string;
  interests: string;
  location: string;
  completion: string;
  notSet: string;
  // Profile values
  male: string;
  female: string;
  both: string;
  year: string;
  archetypeNotSet: string;
  mbtiNotSet: string;
  // Buttons
  editName: string;
  editBio: string;
  editBirthdate: string;
  editGender: string;
  editLookingFor: string;
  editImage: string;
  editUsername: string;
  editMood: string;
  editInterests: string;
  editLocation: string;
  takeQuizzes: string;
}

// Translations for shared strings
const translations: { [key in Language]: ISharedStrings } = {
  [Language.Persian]: {
    profileError: "❌ خطا در نمایش پروفایل. لطفا دوباره تلاش کنید.",
    startFirst: "لطفا ابتدا با دستور /start شروع کنید.",
    registered: "ثبت شده",
    // Profile fields
    profileTitle: "📋 <b>پروفایل شما</b>",
    name: "👤 نام",
    age: "🎂 سن",
    genderLabel: "⚧️ جنسیت",
    lookingFor: "🤝 پیشنهاد",
    biography: "📝 بیوگرافی",
    archetype: "🔮 کهن الگو",
    mbti: "🧠 تست MBTI",
    leftright: "⚖️ سبک شناختی",
    politicalcompass: "🧭 قطب‌نمای سیاسی",
    enneagram: "🎯 انیاگرام",
    bigfive: "📊 پنج عامل بزرگ",
    interests: "🎯 علایق",
    location: "📍 استان",
    completion: "📊 تکمیل",
    notSet: "ثبت نشده",
    // Profile values
    male: "مرد",
    female: "زن",
    both: "هر دو",
    year: "سال",
    archetypeNotSet: "ثبت نشده",
    mbtiNotSet: "ثبت نشده",
    // Buttons
    editName: "✏️ ویرایش نام",
    editBio: "📝 ویرایش بیوگرافی",
    editBirthdate: "🎂 تاریخ تولد",
    editGender: "⚧️ جنسیت",
    editLookingFor: "🤝 پیشنهاد",
    editImage: "📷 تصویر",
    editUsername: "🔗 نام کاربری",
    editMood: "😊 مود",
    editInterests: "🎯 علایق",
    editLocation: "📍 استان",
    takeQuizzes: "🧪 انجام تست‌ها",
  },
  [Language.English]: {
    profileError: "❌ Error displaying profile. Please try again.",
    startFirst: "Please start with the /start command first.",
    registered: "Registered",
    // Profile fields
    profileTitle: "📋 <b>Your Profile</b>",
    name: "👤 Name",
    age: "🎂 Age",
    genderLabel: "⚧️ Gender",
    lookingFor: "🤝 Looking For",
    biography: "📝 Biography",
    archetype: "🔮 Archetype",
    mbti: "🧠 MBTI Test",
    leftright: "⚖️ Cognitive Style",
    politicalcompass: "🧭 Political Compass",
    enneagram: "🎯 Enneagram",
    bigfive: "📊 Big Five",
    interests: "🎯 Interests",
    location: "📍 Province",
    completion: "📊 Completion",
    notSet: "Not set",
    // Profile values
    male: "Male",
    female: "Female",
    both: "Both",
    year: "years",
    archetypeNotSet: "Not set",
    mbtiNotSet: "Not set",
    // Buttons
    editName: "✏️ Edit Name",
    editBio: "📝 Edit Biography",
    editBirthdate: "🎂 Birth Date",
    editGender: "⚧️ Gender",
    editLookingFor: "🤝 Looking For",
    editImage: "📷 Image",
    editUsername: "🔗 Username",
    editMood: "😊 Mood",
    editInterests: "🎯 Interests",
    editLocation: "📍 Province",
    takeQuizzes: "🧪 Take Quizzes",
  },
  [Language.Russian]: {
    profileError:
      "❌ Ошибка отображения профиля. Пожалуйста, попробуйте снова.",
    startFirst: "Пожалуйста, сначала начните с команды /start.",
    registered: "Зарегистрировано",
    // Profile fields
    profileTitle: "📋 <b>Ваш профиль</b>",
    name: "👤 Имя",
    age: "🎂 Возраст",
    genderLabel: "⚧️ Пол",
    lookingFor: "🤝 Ищу",
    biography: "📝 Биография",
    archetype: "🔮 Архетип",
    mbti: "🧠 Тест MBTI",
    leftright: "⚖️ Когнитивный стиль",
    politicalcompass: "🧭 Политический компас",
    enneagram: "🎯 Эннеаграмма",
    bigfive: "📊 Большая пятерка",
    interests: "🎯 Интересы",
    location: "📍 Провинция",
    completion: "📊 Заполнение",
    notSet: "Не установлено",
    // Profile values
    male: "Мужской",
    female: "Женский",
    both: "Оба",
    year: "лет",
    archetypeNotSet: "Не установлено",
    mbtiNotSet: "Не установлено",
    // Buttons
    editName: "✏️ Редактировать имя",
    editBio: "📝 Редактировать биографию",
    editBirthdate: "🎂 Дата рождения",
    editGender: "⚧️ Пол",
    editLookingFor: "🤝 Ищу",
    editImage: "📷 Изображение",
    editUsername: "🔗 Имя пользователя",
    editMood: "😊 Настроение",
    editInterests: "🎯 Интересы",
    editLocation: "📍 Провинция",
    takeQuizzes: "🧪 Пройти тесты",
  },
  [Language.Arabic]: {
    profileError: "❌ خطأ في عرض الملف الشخصي. يرجى المحاولة مرة أخرى.",
    startFirst: "يرجى البدء بأمر /start أولاً.",
    registered: "مسجل",
    // Profile fields
    profileTitle: "📋 <b>ملفك الشخصي</b>",
    name: "👤 الاسم",
    age: "🎂 العمر",
    genderLabel: "⚧️ الجنس",
    lookingFor: "🤝 أبحث عن",
    biography: "📝 السيرة الذاتية",
    archetype: "🔮 النمط الأصلي",
    mbti: "🧠 اختبار MBTI",
    leftright: "⚖️ الأسلوب المعرفي",
    politicalcompass: "🧭 البوصلة السياسية",
    enneagram: "🎯 الإنياجرام",
    bigfive: "📊 العوامل الخمسة الكبرى",
    interests: "🎯 الاهتمامات",
    location: "📍 المحافظة",
    completion: "📊 الإكمال",
    notSet: "غير محدد",
    // Profile values
    male: "ذكر",
    female: "أنثى",
    both: "كلاهما",
    year: "سنة",
    archetypeNotSet: "غير محدد",
    mbtiNotSet: "غير محدد",
    // Buttons
    editName: "✏️ تعديل الاسم",
    editBio: "📝 تعديل السيرة الذاتية",
    editBirthdate: "🎂 تاريخ الميلاد",
    editGender: "⚧️ الجنس",
    editLookingFor: "🤝 أبحث عن",
    editImage: "📷 الصورة",
    editUsername: "🔗 اسم المستخدم",
    editMood: "😊 المزاج",
    editInterests: "🎯 الاهتمامات",
    editLocation: "📍 المحافظة",
    takeQuizzes: "🧪 إجراء الاختبارات",
  },
};

/**
 * Get language for a user based on bot name
 * - MatchFound: Always returns Persian
 * - Inmankist: Gets language from shared user language
 */
export async function getLanguageForUser(
  userId: number | undefined,
  botName: string
): Promise<Language> {
  // MatchFound is Persian only
  if (botName === MATCHFOUND_BOT_NAME) {
    return Language.Persian;
  }

  // For Inmankist and other bots, get language from shared user language
  return await getUserLanguage(userId);
}

/**
 * Get shared strings for a user based on bot name
 */
export async function getSharedStrings(
  userId: number | undefined,
  botName: string
): Promise<ISharedStrings> {
  const language = await getLanguageForUser(userId, botName);
  return translations[language] || translations[Language.Persian];
}


// Interest names translations
const interestTranslations: { [key in Language]: Record<Interest, string> } = {
  [Language.Persian]: {
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
  },
  [Language.English]: {
    // Animals & Pets
    cat: "Cat",
    dog: "Dog",
    bird: "Bird",
    fish: "Fish",
    // Sports & Fitness
    football: "Football",
    basketball: "Basketball",
    tennis: "Tennis",
    swimming: "Swimming",
    running: "Running",
    cycling: "Cycling",
    boxing: "Boxing",
    martial_arts: "Martial Arts",
    golf: "Golf",
    skiing: "Skiing",
    surfing: "Surfing",
    skateboarding: "Skateboarding",
    climbing: "Climbing",
    hiking: "Hiking",
    camping: "Camping",
    fitness: "Fitness",
    yoga: "Yoga",
    meditation: "Meditation",
    // Music
    music: "Music",
    rock: "Rock",
    pop: "Pop",
    jazz: "Jazz",
    classical: "Classical",
    electronic: "Electronic",
    hip_hop: "Hip Hop",
    kpop: "K-Pop",
    guitar: "Guitar",
    piano: "Piano",
    singing: "Singing",
    concerts: "Concerts",
    // Entertainment & Media
    movie: "Movie",
    tv_shows: "TV Shows",
    anime: "Anime",
    manga: "Manga",
    comics: "Comics",
    books: "Books",
    theater: "Theater",
    dancing: "Dancing",
    gaming: "Gaming",
    podcasts: "Podcasts",
    youtube: "YouTube",
    // Technology
    technology: "Technology",
    programming: "Programming",
    ai: "AI",
    photography: "Photography",
    graphic_design: "Graphic Design",
    // Food & Drink
    cooking: "Cooking",
    wine: "Wine",
    coffee: "Coffee",
    tea: "Tea",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    sushi: "Sushi",
    pizza: "Pizza",
    // Travel & Adventure
    traveling: "Traveling",
    history: "History",
    culture: "Culture",
    adventure: "Adventure",
    // Arts & Crafts
    art: "Art",
    painting: "Painting",
    drawing: "Drawing",
    // Fashion & Beauty
    fashion: "Fashion",
    makeup: "Makeup",
    jewelry: "Jewelry",
    shopping: "Shopping",
    vintage: "Vintage",
    // Education & Learning
    education: "Education",
    science: "Science",
    languages: "Languages",
    // Nature & Outdoors
    nature: "Nature",
    gardening: "Gardening",
    // Vehicles
    cars: "Cars",
    bicycles: "Bicycles",
    // Hobbies & Games
    board_games: "Board Games",
    chess: "Chess",
    // Social & Community
    volunteering: "Volunteering",
    events: "Events",
    festivals: "Festivals",
    // Business
    business: "Business",
    // Spiritual & Religious
    spirituality: "Spirituality",
    religion: "Religion",
    // Communication & Media
    content_creation: "Content Creation",
    social_media: "Social Media",
  },
  [Language.Russian]: {
    // Animals & Pets
    cat: "Кот",
    dog: "Собака",
    bird: "Птица",
    fish: "Рыба",
    // Sports & Fitness
    football: "Футбол",
    basketball: "Баскетбол",
    tennis: "Теннис",
    swimming: "Плавание",
    running: "Бег",
    cycling: "Велоспорт",
    boxing: "Бокс",
    martial_arts: "Боевые искусства",
    golf: "Гольф",
    skiing: "Лыжи",
    surfing: "Серфинг",
    skateboarding: "Скейтбординг",
    climbing: "Скалолазание",
    hiking: "Походы",
    camping: "Кемпинг",
    fitness: "Фитнес",
    yoga: "Йога",
    meditation: "Медитация",
    // Music
    music: "Музыка",
    rock: "Рок",
    pop: "Поп",
    jazz: "Джаз",
    classical: "Классика",
    electronic: "Электронная",
    hip_hop: "Хип-хоп",
    kpop: "К-поп",
    guitar: "Гитара",
    piano: "Пианино",
    singing: "Пение",
    concerts: "Концерты",
    // Entertainment & Media
    movie: "Кино",
    tv_shows: "ТВ-шоу",
    anime: "Аниме",
    manga: "Манга",
    comics: "Комиксы",
    books: "Книги",
    theater: "Театр",
    dancing: "Танцы",
    gaming: "Игры",
    podcasts: "Подкасты",
    youtube: "YouTube",
    // Technology
    technology: "Технологии",
    programming: "Программирование",
    ai: "ИИ",
    photography: "Фотография",
    graphic_design: "Графический дизайн",
    // Food & Drink
    cooking: "Кулинария",
    wine: "Вино",
    coffee: "Кофе",
    tea: "Чай",
    vegetarian: "Вегетарианство",
    vegan: "Веганство",
    sushi: "Суши",
    pizza: "Пицца",
    // Travel & Adventure
    traveling: "Путешествия",
    history: "История",
    culture: "Культура",
    adventure: "Приключения",
    // Arts & Crafts
    art: "Искусство",
    painting: "Живопись",
    drawing: "Рисование",
    // Fashion & Beauty
    fashion: "Мода",
    makeup: "Макияж",
    jewelry: "Украшения",
    shopping: "Шопинг",
    vintage: "Винтаж",
    // Education & Learning
    education: "Образование",
    science: "Наука",
    languages: "Языки",
    // Nature & Outdoors
    nature: "Природа",
    gardening: "Садоводство",
    // Vehicles
    cars: "Автомобили",
    bicycles: "Велосипеды",
    // Hobbies & Games
    board_games: "Настольные игры",
    chess: "Шахматы",
    // Social & Community
    volunteering: "Волонтерство",
    events: "События",
    festivals: "Фестивали",
    // Business
    business: "Бизнес",
    // Spiritual & Religious
    spirituality: "Духовность",
    religion: "Религия",
    // Communication & Media
    content_creation: "Создание контента",
    social_media: "Социальные сети",
  },
  [Language.Arabic]: {
    // Animals & Pets
    cat: "قطة",
    dog: "كلب",
    bird: "طائر",
    fish: "سمك",
    // Sports & Fitness
    football: "كرة القدم",
    basketball: "كرة السلة",
    tennis: "التنس",
    swimming: "السباحة",
    running: "الجري",
    cycling: "ركوب الدراجات",
    boxing: "الملاكمة",
    martial_arts: "فنون قتالية",
    golf: "الجولف",
    skiing: "التزلج",
    surfing: "ركوب الأمواج",
    skateboarding: "التزلج على الألواح",
    climbing: "تسلق الصخور",
    hiking: "المشي لمسافات طويلة",
    camping: "التخييم",
    fitness: "اللياقة البدنية",
    yoga: "اليوجا",
    meditation: "التأمل",
    // Music
    music: "الموسيقى",
    rock: "الروك",
    pop: "البوب",
    jazz: "الجاز",
    classical: "الكلاسيكية",
    electronic: "الإلكترونية",
    hip_hop: "الهيب هوب",
    kpop: "الكيبوب",
    guitar: "الجيتار",
    piano: "البيانو",
    singing: "الغناء",
    concerts: "الحفلات",
    // Entertainment & Media
    movie: "الأفلام",
    tv_shows: "البرامج التلفزيونية",
    anime: "الأنمي",
    manga: "المانجا",
    comics: "الكوميكس",
    books: "الكتب",
    theater: "المسرح",
    dancing: "الرقص",
    gaming: "الألعاب",
    podcasts: "البودكاست",
    youtube: "يوتيوب",
    // Technology
    technology: "التكنولوجيا",
    programming: "البرمجة",
    ai: "الذكاء الاصطناعي",
    photography: "التصوير",
    graphic_design: "التصميم الجرافيكي",
    // Food & Drink
    cooking: "الطبخ",
    wine: "النبيذ",
    coffee: "القهوة",
    tea: "الشاي",
    vegetarian: "نباتي",
    vegan: "نباتي صرف",
    sushi: "السوشي",
    pizza: "البيتزا",
    // Travel & Adventure
    traveling: "السفر",
    history: "التاريخ",
    culture: "الثقافة",
    adventure: "المغامرة",
    // Arts & Crafts
    art: "الفن",
    painting: "الرسم",
    drawing: "الرسم",
    // Fashion & Beauty
    fashion: "الموضة",
    makeup: "المكياج",
    jewelry: "المجوهرات",
    shopping: "التسوق",
    vintage: "الكلاسيكي",
    // Education & Learning
    education: "التعليم",
    science: "العلوم",
    languages: "اللغات",
    // Nature & Outdoors
    nature: "الطبيعة",
    gardening: "البستنة",
    // Vehicles
    cars: "السيارات",
    bicycles: "الدراجات",
    // Hobbies & Games
    board_games: "ألعاب الطاولة",
    chess: "الشطرنج",
    // Social & Community
    volunteering: "التطوع",
    events: "الفعاليات",
    festivals: "المهرجانات",
    // Business
    business: "الأعمال",
    // Spiritual & Religious
    spirituality: "الروحانية",
    religion: "الدين",
    // Communication & Media
    content_creation: "إنشاء المحتوى",
    social_media: "وسائل التواصل الاجتماعي",
  },
};

/**
 * Get interest names for a user based on bot name
 */
export async function getInterestNames(
  userId: number | undefined,
  botName: string
): Promise<Record<Interest, string>> {
  const language = await getLanguageForUser(userId, botName);
  return interestTranslations[language] || interestTranslations[Language.Persian];
}

// Province names translations
const provinceTranslations: { [key in Language]: Record<IranProvince, string> } = {
  [Language.Persian]: {
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
  },
  [Language.English]: {
    tehran: "Tehran",
    isfahan: "Isfahan",
    fars: "Fars",
    khuzestan: "Khuzestan",
    east_azerbaijan: "East Azerbaijan",
    mazandaran: "Mazandaran",
    khorasan_razavi: "Razavi Khorasan",
    alborz: "Alborz",
    gilan: "Gilan",
    kerman: "Kerman",
    west_azerbaijan: "West Azerbaijan",
    semnan: "Semnan",
    qom: "Qom",
    golestan: "Golestan",
    kurdistan: "Kurdistan",
    yazd: "Yazd",
    ardabil: "Ardabil",
    kermanshah: "Kermanshah",
    hormozgan: "Hormozgan",
    markazi: "Markazi",
    hamadan: "Hamadan",
    lorestan: "Lorestan",
    khorasan_south: "South Khorasan",
    zanjan: "Zanjan",
    khorasan_north: "North Khorasan",
    qazvin: "Qazvin",
    chaharmahal_bakhtiari: "Chaharmahal and Bakhtiari",
    bushehr: "Bushehr",
    kohgiluyeh_boyer_ahmad: "Kohgiluyeh and Boyer-Ahmad",
    ilam: "Ilam",
    sistan_baluchestan: "Sistan and Baluchestan",
  },
  [Language.Russian]: {
    tehran: "Тегеран",
    isfahan: "Исфахан",
    fars: "Фарс",
    khuzestan: "Хузестан",
    east_azerbaijan: "Восточный Азербайджан",
    mazandaran: "Мазендеран",
    khorasan_razavi: "Разави Хорасан",
    alborz: "Эльбурс",
    gilan: "Гилан",
    kerman: "Керман",
    west_azerbaijan: "Западный Азербайджан",
    semnan: "Семнан",
    qom: "Кум",
    golestan: "Голестан",
    kurdistan: "Курдистан",
    yazd: "Йезд",
    ardabil: "Ардебиль",
    kermanshah: "Керманшах",
    hormozgan: "Хормозган",
    markazi: "Маркази",
    hamadan: "Хамадан",
    lorestan: "Лорестан",
    khorasan_south: "Южный Хорасан",
    zanjan: "Зенджан",
    khorasan_north: "Северный Хорасан",
    qazvin: "Казвин",
    chaharmahal_bakhtiari: "Чахармахал и Бахтиари",
    bushehr: "Бушир",
    kohgiluyeh_boyer_ahmad: "Кохгилуйе и Бойер-Ахмад",
    ilam: "Илам",
    sistan_baluchestan: "Систан и Белуджистан",
  },
  [Language.Arabic]: {
    tehran: "طهران",
    isfahan: "أصفهان",
    fars: "فارس",
    khuzestan: "خوزستان",
    east_azerbaijan: "أذربيجان الشرقية",
    mazandaran: "مازندران",
    khorasan_razavi: "خراسان رضوي",
    alborz: "البرز",
    gilan: "جيلان",
    kerman: "كرمان",
    west_azerbaijan: "أذربيجان الغربية",
    semnan: "سمنان",
    qom: "قم",
    golestan: "جولستان",
    kurdistan: "كردستان",
    yazd: "يزد",
    ardabil: "أردبيل",
    kermanshah: "كرمانشاه",
    hormozgan: "هرمزگان",
    markazi: "مركزي",
    hamadan: "همدان",
    lorestan: "لورستان",
    khorasan_south: "خراسان الجنوبية",
    zanjan: "زنجان",
    khorasan_north: "خراسان الشمالية",
    qazvin: "قزوين",
    chaharmahal_bakhtiari: "تشهارمحال وبختياري",
    bushehr: "بوشهر",
    kohgiluyeh_boyer_ahmad: "كهكيلويه وبوير أحمد",
    ilam: "إيلام",
    sistan_baluchestan: "سيستان وبلوشستان",
  },
};

/**
 * Get province names for a user based on bot name
 */
export async function getProvinceNames(
  userId: number | undefined,
  botName: string
): Promise<Record<IranProvince, string>> {
  const language = await getLanguageForUser(userId, botName);
  return provinceTranslations[language] || provinceTranslations[Language.Persian];
}
