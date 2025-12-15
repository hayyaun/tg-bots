import { BOT_NAME as MATCHFOUND_BOT_NAME } from "../matchfound/constants";
import { getWithPrefix, setWithPrefix } from "../redis";
import {
  IRAN_PROVINCES,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_INTERESTS,
  MIN_INTERESTS,
  MIN_AGE,
  MAX_AGE,
  type Interest,
} from "./constants";
import { Language } from "./types";

export type IranProvince = (typeof IRAN_PROVINCES)[number];

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

export interface IProfileStrings {
  errors: {
    editCancelled: string;
    nameTooLong: string;
    bioTooLong: string;
    invalidDate: string;
    invalidDateValue: string;
    futureDate: string;
    invalidAge: string;
    updateFailed: string;
    invalidMood: string;
    invalidProvince: string;
    invalidOperation: string;
    addImageFailed: string;
    noUsername: string;
    maxInterestsReached: string;
    minInterestsRequired: string;
    minInterestsNotMet: (currentCount: number) => string;
  };
  success: {
    nameUpdated: (name: string) => string;
    bioUpdated: string;
    birthdateUpdated: (age: number) => string;
    genderUpdated: (gender: string) => string;
    lookingForUpdated: (text: string) => string;
    moodUpdated: (mood: string) => string;
    imageCleared: string;
    imageAdded: () => string;
    usernameUpdated: (username: string) => string;
  };
  profileValues: {
    male: string;
    female: string;
    both: string;
    year: string;
  };
  buttons: {
    editProfile: string;
    completionStatus: string;
    findPeople: string;
    takeQuizzes: string;
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
    like: string;
    dislike: string;
    report: string;
    chat: string;
    delete: string;
    previous: string;
    next: string;
    addImage: string;
    clearImage: string;
  };
  editPrompts: {
    name: string;
    bio: string;
    birthdate: string;
    gender: string;
    lookingFor: string;
    image: {
      hasImage: () => string;
      noImage: string;
    };
    mood: string;
    interests: (selectedCount: number, currentPage: number, totalPages: number) => string;
    location: (currentPage: number, totalPages: number) => string;
    locationSelected: (provinceName: string, currentPage: number, totalPages: number) => string;
    photo: string;
  };
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
    archetype: "کهن الگو",
    mbti: "تست MBTI",
    leftright: "سبک شناختی",
    politicalcompass: "قطب‌نمای سیاسی",
    enneagram: "انیاگرام",
    bigfive: "پنج عامل بزرگ",
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
    archetype: "Archetype",
    mbti: "MBTI Test",
    leftright: "Cognitive Style",
    politicalcompass: "Political Compass",
    enneagram: "Enneagram",
    bigfive: "Big Five",
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
    archetype: "Архетип",
    mbti: "Тест MBTI",
    leftright: "Когнитивный стиль",
    politicalcompass: "Политический компас",
    enneagram: "Эннеаграмма",
    bigfive: "Большая пятерка",
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
    archetype: "النمط الأصلي",
    mbti: "اختبار MBTI",
    leftright: "الأسلوب المعرفي",
    politicalcompass: "البوصلة السياسية",
    enneagram: "الإنياجرام",
    bigfive: "العوامل الخمسة الكبرى",
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

const profileTranslations: { [key in Language]: IProfileStrings } = {
  [Language.Persian]: {
    errors: {
      editCancelled: "❌ ویرایش لغو شد.",
      nameTooLong: `❌ نام نمایشی نمی‌تواند بیشتر از ${MAX_DISPLAY_NAME_LENGTH} کاراکتر باشد.`,
      bioTooLong: "❌ بیوگرافی نمی‌تواند بیشتر از 500 کاراکتر باشد.",
      invalidDate: "❌ فرمت تاریخ نامعتبر است. لطفا به فرمت YYYY-MM-DD ارسال کنید (مثال: 1995-05-15)",
      invalidDateValue: "❌ تاریخ نامعتبر است.",
      futureDate: "❌ تاریخ تولد نمی‌تواند در آینده باشد.",
      invalidAge: `❌ سن باید بین ${MIN_AGE} تا ${MAX_AGE} سال باشد.`,
      updateFailed: "❌ خطا در به‌روزرسانی پروفایل.",
      invalidMood: "❌ مود نامعتبر است.",
      invalidProvince: "❌ استان نامعتبر است.",
      invalidOperation: "عملیات نامعتبر است.",
      addImageFailed: "❌ خطا در افزودن تصویر.",
      noUsername:
        "❌ شما در حال حاضر نام کاربری تلگرام ندارید.\n\nلطفا در تنظیمات تلگرام یک نام کاربری تنظیم کنید و سپس دوباره این دکمه را بزنید.",
      maxInterestsReached: `❌ شما نمی‌توانید بیشتر از ${MAX_INTERESTS} علاقه انتخاب کنید. لطفا ابتدا یکی از علایق فعلی را حذف کنید.`,
      minInterestsRequired: `❌ شما باید حداقل ${MIN_INTERESTS} علاقه داشته باشید. نمی‌توانید کمتر از ${MIN_INTERESTS} علاقه انتخاب کنید.`,
      minInterestsNotMet: (currentCount: number) =>
        `❌ برای استفاده از این دستور، باید حداقل ${MIN_INTERESTS} علاقه انتخاب کنید.\n\n` +
        `وضعیت فعلی: ${currentCount} علاقه\n\n` +
        `از دستور /profile برای ویرایش علایق استفاده کنید.`,
    },
    success: {
      nameUpdated: (name: string) => `✅ نام نمایشی به "${name}" تغییر یافت.`,
      bioUpdated: "✅ بیوگرافی به‌روزرسانی شد.",
      birthdateUpdated: (age: number) => `✅ تاریخ تولد ثبت شد. سن شما: ${age} سال`,
      genderUpdated: (gender: string) => `✅ جنسیت به "${gender}" تغییر یافت.`,
      lookingForUpdated: (text: string) => `✅ تنظیمات به "${text}" تغییر یافت.`,
      moodUpdated: (mood: string) => `✅ مود به ${mood} تغییر یافت.`,
      imageCleared: "✅ تصویر حذف شد.",
      imageAdded: () => `✅ تصویر به‌روزرسانی شد.`,
      usernameUpdated: (username: string) =>
        `✅ نام کاربری به‌روزرسانی شد: @${username}\n\nنام کاربری شما از پروفایل تلگرام شما خوانده می‌شود و به صورت خودکار به‌روزرسانی می‌شود.`,
    },
    profileValues: {
      male: "مرد",
      female: "زن",
      both: "هر دو",
      year: "سال",
    },
    buttons: {
      editProfile: "📝 ویرایش پروفایل",
      completionStatus: "📊 وضعیت تکمیل پروفایل",
      findPeople: "🔍 پیدا کردن افراد",
      takeQuizzes: "🧪 انجام تست‌ها",
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
      like: "❤️ لایک",
      dislike: "❌ رد",
      report: "🚫 گزارش",
      chat: "💬 چت",
      delete: "🗑️ حذف",
      previous: "◀️ قبلی",
      next: "بعدی ▶️",
      addImage: "➕ افزودن/تغییر تصویر",
      clearImage: "🗑️ حذف تصویر",
    },
    editPrompts: {
      name: `لطفا نام نمایشی خود را ارسال کنید (حداکثر ${MAX_DISPLAY_NAME_LENGTH} کاراکتر):\n\nبرای لغو: /cancel`,
      bio: "لطفا بیوگرافی خود را ارسال کنید (حداکثر 500 کاراکتر):\n\n📝 تعداد کاراکتر: 0/500\n\nبرای لغو: /cancel",
      birthdate: "لطفا تاریخ تولد خود را به فرمت YYYY-MM-DD ارسال کنید (مثال: 1995-05-15):\n\nبرای لغو: /cancel",
      gender: "جنسیت خود را انتخاب کنید:",
      lookingFor: "می‌خواهید چه کسی به شما پیشنهاد شود؟",
      image: {
        hasImage: () =>
          `شما یک تصویر دارید.\n\nبرای تغییر تصویر، یک عکس جدید ارسال کنید (تصویر قبلی جایگزین می‌شود).\nبرای حذف تصویر، از دکمه زیر استفاده کنید.`,
        noImage:
          "شما هنوز تصویری ندارید.\n\nبرای افزودن تصویر، یک عکس ارسال کنید:\n\n⚠️ فقط می‌توانید 1 تصویر داشته باشید.\n\nبرای لغو: /cancel",
      },
      mood: "مود خود را انتخاب کنید:",
      interests: (selectedCount: number, currentPage: number, totalPages: number) =>
        `🎯 علایق خود را انتخاب کنید (${selectedCount}/${MAX_INTERESTS} مورد انتخاب شده)\nصفحه ${currentPage}/${totalPages}\n\nبرای انتخاب/لغو انتخاب هر مورد، روی آن کلیک کنید. تغییرات به صورت خودکار ذخیره می‌شوند.\n\n⚠️ باید حداقل ${MIN_INTERESTS} و حداکثر ${MAX_INTERESTS} علاقه انتخاب کنید.`,
      location: (currentPage: number, totalPages: number) =>
        `📍 استان خود را انتخاب کنید\nصفحه ${currentPage}/${totalPages}\n\nبرای انتخاب استان، روی آن کلیک کنید.`,
      locationSelected: (provinceName: string, currentPage: number, totalPages: number) =>
        `📍 استان خود را انتخاب کنید\n✅ انتخاب شده: ${provinceName}\nصفحه ${currentPage}/${totalPages}\n\nبرای تغییر استان، روی استان دیگری کلیک کنید.`,
      photo: "لطفا یک عکس ارسال کنید:\n\nبرای لغو: /cancel",
    },
  },
  [Language.English]: {
    errors: {
      editCancelled: "❌ Edit cancelled.",
      nameTooLong: `❌ Display name cannot be longer than ${MAX_DISPLAY_NAME_LENGTH} characters.`,
      bioTooLong: "❌ Biography cannot exceed 500 characters.",
      invalidDate: "❌ Invalid date format. Please send in YYYY-MM-DD (e.g., 1995-05-15).",
      invalidDateValue: "❌ Invalid date.",
      futureDate: "❌ Birthdate cannot be in the future.",
      invalidAge: `❌ Age must be between ${MIN_AGE} and ${MAX_AGE} years.`,
      updateFailed: "❌ Failed to update profile.",
      invalidMood: "❌ Invalid mood.",
      invalidProvince: "❌ Invalid province.",
      invalidOperation: "Invalid operation.",
      addImageFailed: "❌ Failed to add image.",
      noUsername:
        "❌ You don't have a Telegram username right now.\n\nPlease set a username in Telegram settings, then press this button again.",
      maxInterestsReached: `❌ You can't pick more than ${MAX_INTERESTS} interests. Remove one first.`,
      minInterestsRequired: `❌ You must have at least ${MIN_INTERESTS} interests. You can't go below ${MIN_INTERESTS}.`,
      minInterestsNotMet: (currentCount: number) =>
        `❌ To use this command, you need at least ${MIN_INTERESTS} interests.\n\n` +
        `Current: ${currentCount} interests\n\n` +
        `Use /profile to edit your interests.`,
    },
    success: {
      nameUpdated: (name: string) => `✅ Display name changed to "${name}".`,
      bioUpdated: "✅ Biography updated.",
      birthdateUpdated: (age: number) => `✅ Birthdate saved. Your age: ${age}.`,
      genderUpdated: (gender: string) => `✅ Gender changed to "${gender}".`,
      lookingForUpdated: (text: string) => `✅ Preference changed to "${text}".`,
      moodUpdated: (mood: string) => `✅ Mood set to ${mood}.`,
      imageCleared: "✅ Image removed.",
      imageAdded: () => `✅ Image updated.`,
      usernameUpdated: (username: string) =>
        `✅ Username updated: @${username}\n\nYour Telegram profile username is read automatically and kept up to date.`,
    },
    profileValues: {
      male: "Male",
      female: "Female",
      both: "Both",
      year: "years",
    },
    buttons: {
      editProfile: "📝 Edit Profile",
      completionStatus: "📊 Profile Completion",
      findPeople: "🔍 Find People",
      takeQuizzes: "🧪 Take Quizzes",
      editName: "✏️ Edit Name",
      editBio: "📝 Edit Biography",
      editBirthdate: "🎂 Birthdate",
      editGender: "⚧️ Gender",
      editLookingFor: "🤝 Looking For",
      editImage: "📷 Image",
      editUsername: "🔗 Username",
      editMood: "😊 Mood",
      editInterests: "🎯 Interests",
      editLocation: "📍 Province",
      like: "❤️ Like",
      dislike: "❌ Pass",
      report: "🚫 Report",
      chat: "💬 Chat",
      delete: "🗑️ Delete",
      previous: "◀️ Previous",
      next: "Next ▶️",
      addImage: "➕ Add/Change Image",
      clearImage: "🗑️ Remove Image",
    },
    editPrompts: {
      name: `Please send your display name (max ${MAX_DISPLAY_NAME_LENGTH} characters):\n\nTo cancel: /cancel`,
      bio: "Please send your biography (max 500 characters):\n\n📝 Characters: 0/500\n\nTo cancel: /cancel",
      birthdate: "Please send your birthdate in YYYY-MM-DD (e.g., 1995-05-15):\n\nTo cancel: /cancel",
      gender: "Choose your gender:",
      lookingFor: "Who do you want to be suggested?",
      image: {
        hasImage: () =>
          `You already have an image.\n\nSend a new photo to replace it.\nUse the button below to remove your current image.`,
        noImage:
          "You don't have an image yet.\n\nSend a photo to add one:\n\n⚠️ You can only have 1 image.\n\nTo cancel: /cancel",
      },
      mood: "Choose your mood:",
      interests: (selectedCount: number, currentPage: number, totalPages: number) =>
        `🎯 Select your interests (${selectedCount}/${MAX_INTERESTS} selected)\nPage ${currentPage}/${totalPages}\n\nTap to toggle. Changes save automatically.\n\n⚠️ You must select at least ${MIN_INTERESTS} and at most ${MAX_INTERESTS}.`,
      location: (currentPage: number, totalPages: number) =>
        `📍 Choose your province\nPage ${currentPage}/${totalPages}\n\nTap a province to select.`,
      locationSelected: (provinceName: string, currentPage: number, totalPages: number) =>
        `📍 Choose your province\n✅ Selected: ${provinceName}\nPage ${currentPage}/${totalPages}\n\nTap another province to change.`,
      photo: "Please send a photo:\n\nTo cancel: /cancel",
    },
  },
  [Language.Russian]: {
    errors: {
      editCancelled: "❌ Редактирование отменено.",
      nameTooLong: `❌ Имя не может быть длиннее ${MAX_DISPLAY_NAME_LENGTH} символов.`,
      bioTooLong: "❌ Биография не может превышать 500 символов.",
      invalidDate: "❌ Неверный формат даты. Используйте YYYY-MM-DD (например, 1995-05-15).",
      invalidDateValue: "❌ Неверная дата.",
      futureDate: "❌ Дата рождения не может быть в будущем.",
      invalidAge: `❌ Возраст должен быть от ${MIN_AGE} до ${MAX_AGE} лет.`,
      updateFailed: "❌ Не удалось обновить профиль.",
      invalidMood: "❌ Недопустимое настроение.",
      invalidProvince: "❌ Недопустимая провинция.",
      invalidOperation: "Недопустимая операция.",
      addImageFailed: "❌ Не удалось добавить изображение.",
      noUsername:
        "❌ У вас нет имени пользователя Telegram.\n\nУстановите имя пользователя в настройках Telegram и нажмите кнопку снова.",
      maxInterestsReached: `❌ Нельзя выбрать больше ${MAX_INTERESTS} интересов. Сначала удалите один.`,
      minInterestsRequired: `❌ Нужно минимум ${MIN_INTERESTS} интересов. Нельзя иметь меньше ${MIN_INTERESTS}.`,
      minInterestsNotMet: (currentCount: number) =>
        `❌ Для этой команды нужно минимум ${MIN_INTERESTS} интересов.\n\n` +
        `Сейчас: ${currentCount} интересов\n\n` +
        `Используйте /profile, чтобы изменить интересы.`,
    },
    success: {
      nameUpdated: (name: string) => `✅ Имя изменено на «${name}».`,
      bioUpdated: "✅ Биография обновлена.",
      birthdateUpdated: (age: number) => `✅ Дата рождения сохранена. Ваш возраст: ${age}.`,
      genderUpdated: (gender: string) => `✅ Пол изменён на «${gender}».`,
      lookingForUpdated: (text: string) => `✅ Предпочтение изменено на «${text}».`,
      moodUpdated: (mood: string) => `✅ Настроение установлено: ${mood}.`,
      imageCleared: "✅ Изображение удалено.",
      imageAdded: () => `✅ Изображение обновлено.`,
      usernameUpdated: (username: string) =>
        `✅ Имя пользователя обновлено: @${username}\n\nИмя пользователя читается из профиля Telegram и обновляется автоматически.`,
    },
    profileValues: {
      male: "Мужчина",
      female: "Женщина",
      both: "Оба",
      year: "лет",
    },
    buttons: {
      editProfile: "📝 Редактировать профиль",
      completionStatus: "📊 Заполненность профиля",
      findPeople: "🔍 Найти людей",
      takeQuizzes: "🧪 Пройти тесты",
      editName: "✏️ Имя",
      editBio: "📝 Биография",
      editBirthdate: "🎂 Дата рождения",
      editGender: "⚧️ Пол",
      editLookingFor: "🤝 Предпочтения",
      editImage: "📷 Фото",
      editUsername: "🔗 Имя пользователя",
      editMood: "😊 Настроение",
      editInterests: "🎯 Интересы",
      editLocation: "📍 Провинция",
      like: "❤️ Лайк",
      dislike: "❌ Пропустить",
      report: "🚫 Пожаловаться",
      chat: "💬 Чат",
      delete: "🗑️ Удалить",
      previous: "◀️ Назад",
      next: "Далее ▶️",
      addImage: "➕ Добавить/сменить фото",
      clearImage: "🗑️ Удалить фото",
    },
    editPrompts: {
      name: `Отправьте имя (макс. ${MAX_DISPLAY_NAME_LENGTH} символов):\n\nОтмена: /cancel`,
      bio: "Отправьте биографию (макс. 500 символов):\n\n📝 Символы: 0/500\n\nОтмена: /cancel",
      birthdate: "Отправьте дату в формате YYYY-MM-DD (например, 1995-05-15):\n\nОтмена: /cancel",
      gender: "Выберите пол:",
      lookingFor: "Кого вы хотите видеть в рекомендациях?",
      image: {
        hasImage: () =>
          `У вас уже есть фото.\n\nОтправьте новое, чтобы заменить.\nИспользуйте кнопку ниже, чтобы удалить текущее фото.`,
        noImage:
          "У вас ещё нет фото.\n\nОтправьте фото, чтобы добавить его.\n\n⚠️ Можно иметь только 1 фото.\n\nОтмена: /cancel",
      },
      mood: "Выберите настроение:",
      interests: (selectedCount: number, currentPage: number, totalPages: number) =>
        `🎯 Выберите интересы (${selectedCount}/${MAX_INTERESTS})\nСтраница ${currentPage}/${totalPages}\n\nНажмите, чтобы переключить. Изменения сохраняются автоматически.\n\n⚠️ Минимум ${MIN_INTERESTS}, максимум ${MAX_INTERESTS}.`,
      location: (currentPage: number, totalPages: number) =>
        `📍 Выберите провинцию\nСтраница ${currentPage}/${totalPages}\n\nНажмите на провинцию, чтобы выбрать.`,
      locationSelected: (provinceName: string, currentPage: number, totalPages: number) =>
        `📍 Выберите провинцию\n✅ Выбрано: ${provinceName}\nСтраница ${currentPage}/${totalPages}\n\nНажмите другую провинцию, чтобы изменить.`,
      photo: "Пожалуйста, отправьте фото:\n\nОтмена: /cancel",
    },
  },
  [Language.Arabic]: {
    errors: {
      editCancelled: "❌ تم إلغاء التعديل.",
      nameTooLong: `❌ لا يمكن أن يتجاوز الاسم ${MAX_DISPLAY_NAME_LENGTH} حرفًا.`,
      bioTooLong: "❌ لا يمكن أن تتجاوز السيرة الذاتية 500 حرف.",
      invalidDate: "❌ تنسيق التاريخ غير صالح. أرسل بالتنسيق YYYY-MM-DD (مثال: 1995-05-15).",
      invalidDateValue: "❌ تاريخ غير صالح.",
      futureDate: "❌ لا يمكن أن يكون تاريخ الميلاد في المستقبل.",
      invalidAge: `❌ يجب أن يكون العمر بين ${MIN_AGE} و ${MAX_AGE} سنة.`,
      updateFailed: "❌ فشل تحديث الملف الشخصي.",
      invalidMood: "❌ مزاج غير صالح.",
      invalidProvince: "❌ محافظة غير صالحة.",
      invalidOperation: "عملية غير صالحة.",
      addImageFailed: "❌ فشل إضافة الصورة.",
      noUsername:
        "❌ ليس لديك اسم مستخدم في تلغرام حاليًا.\n\nيرجى تعيين اسم مستخدم في إعدادات تلغرام ثم اضغط الزر مرة أخرى.",
      maxInterestsReached: `❌ لا يمكنك اختيار أكثر من ${MAX_INTERESTS} اهتمامًا. احذف واحدًا أولاً.`,
      minInterestsRequired: `❌ يجب أن يكون لديك على الأقل ${MIN_INTERESTS} اهتمامات. لا يمكنك أن تقل عن ${MIN_INTERESTS}.`,
      minInterestsNotMet: (currentCount: number) =>
        `❌ لاستخدام هذا الأمر، تحتاج إلى ${MIN_INTERESTS} اهتمامات على الأقل.\n\n` +
        `الحالي: ${currentCount} اهتمام\n\n` +
        `استخدم /profile لتعديل الاهتمامات.`,
    },
    success: {
      nameUpdated: (name: string) => `✅ تم تغيير الاسم إلى "${name}".`,
      bioUpdated: "✅ تم تحديث السيرة الذاتية.",
      birthdateUpdated: (age: number) => `✅ تم حفظ تاريخ الميلاد. عمرك: ${age}.`,
      genderUpdated: (gender: string) => `✅ تم تغيير الجنس إلى "${gender}".`,
      lookingForUpdated: (text: string) => `✅ تم تغيير التفضيل إلى "${text}".`,
      moodUpdated: (mood: string) => `✅ تم ضبط المزاج إلى ${mood}.`,
      imageCleared: "✅ تم حذف الصورة.",
      imageAdded: () => `✅ تم تحديث الصورة.`,
      usernameUpdated: (username: string) =>
        `✅ تم تحديث اسم المستخدم: @${username}\n\nيتم قراءة اسم المستخدم من ملفك في تلغرام وتحديثه تلقائيًا.`,
    },
    profileValues: {
      male: "ذكر",
      female: "أنثى",
      both: "كلاهما",
      year: "سنة",
    },
    buttons: {
      editProfile: "📝 تعديل الملف",
      completionStatus: "📊 اكتمال الملف",
      findPeople: "🔍 ابحث عن أشخاص",
      takeQuizzes: "🧪 إجراء الاختبارات",
      editName: "✏️ تعديل الاسم",
      editBio: "📝 تعديل السيرة",
      editBirthdate: "🎂 تاريخ الميلاد",
      editGender: "⚧️ الجنس",
      editLookingFor: "🤝 التفضيل",
      editImage: "📷 الصورة",
      editUsername: "🔗 اسم المستخدم",
      editMood: "😊 المزاج",
      editInterests: "🎯 الاهتمامات",
      editLocation: "📍 المحافظة",
      like: "❤️ إعجاب",
      dislike: "❌ تخطي",
      report: "🚫 بلاغ",
      chat: "💬 دردشة",
      delete: "🗑️ حذف",
      previous: "◀️ السابق",
      next: "التالي ▶️",
      addImage: "➕ إضافة/تغيير الصورة",
      clearImage: "🗑️ حذف الصورة",
    },
    editPrompts: {
      name: `أرسل اسم العرض (بحد أقصى ${MAX_DISPLAY_NAME_LENGTH} حرفًا):\n\nللإلغاء: /cancel`,
      bio: "أرسل سيرتك الذاتية (بحد أقصى 500 حرف):\n\n📝 عدد الأحرف: 0/500\n\nللإلغاء: /cancel",
      birthdate: "أرسل تاريخ ميلادك بصيغة YYYY-MM-DD (مثال: 1995-05-15):\n\nللإلغاء: /cancel",
      gender: "اختر جنسك:",
      lookingFor: "من تريد أن يتم اقتراحه لك؟",
      image: {
        hasImage: () =>
          `لديك صورة بالفعل.\n\nأرسل صورة جديدة لاستبدالها.\nاستخدم الزر أدناه لحذف صورتك الحالية.`,
        noImage:
          "ليس لديك صورة بعد.\n\nأرسل صورة لإضافتها:\n\n⚠️ يمكنك امتلاك صورة واحدة فقط.\n\nللإلغاء: /cancel",
      },
      mood: "اختر مزاجك:",
      interests: (selectedCount: number, currentPage: number, totalPages: number) =>
        `🎯 اختر اهتماماتك (${selectedCount}/${MAX_INTERESTS})\nالصفحة ${currentPage}/${totalPages}\n\nاضغط للتبديل. يتم الحفظ تلقائيًا.\n\n⚠️ يجب اختيار ما لا يقل عن ${MIN_INTERESTS} ولا يزيد عن ${MAX_INTERESTS}.`,
      location: (currentPage: number, totalPages: number) =>
        `📍 اختر محافظتك\nالصفحة ${currentPage}/${totalPages}\n\nاضغط على المحافظة للاختيار.`,
      locationSelected: (provinceName: string, currentPage: number, totalPages: number) =>
        `📍 اختر محافظتك\n✅ المختارة: ${provinceName}\nالصفحة ${currentPage}/${totalPages}\n\nاضغط محافظة أخرى للتغيير.`,
      photo: "يرجى إرسال صورة:\n\nللإلغاء: /cancel",
    },
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

export async function getProfileStrings(
  userId: number | undefined,
  botName: string
): Promise<IProfileStrings> {
  const language = await getLanguageForUser(userId, botName);
  return profileTranslations[language] || profileTranslations[Language.Persian];
}

export function getProfileStringsSync(language: Language): IProfileStrings {
  return profileTranslations[language] || profileTranslations[Language.Persian];
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
  return (
    interestTranslations[language] || interestTranslations[Language.Persian]
  );
}

// Province names translations
const provinceTranslations: {
  [key in Language]: Record<IranProvince, string>;
} = {
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
  return (
    provinceTranslations[language] || provinceTranslations[Language.Persian]
  );
}
