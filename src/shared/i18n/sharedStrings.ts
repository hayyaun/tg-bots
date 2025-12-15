import { Language } from "../types";
import { getLanguageForUser } from "./language";

export interface ISharedStrings {
  profileError: string;
  startFirst: string;
  registered: string;
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

const translations: { [key in Language]: ISharedStrings } = {
  [Language.Persian]: {
    profileError: "❌ خطا در نمایش پروفایل. لطفا دوباره تلاش کنید.",
    startFirst: "لطفا ابتدا با دستور /start شروع کنید.",
    registered: "ثبت شده",
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
    male: "مرد",
    female: "زن",
    both: "هر دو",
    year: "سال",
    archetypeNotSet: "ثبت نشده",
    mbtiNotSet: "ثبت نشده",
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
    male: "Male",
    female: "Female",
    both: "Both",
    year: "years",
    archetypeNotSet: "Not set",
    mbtiNotSet: "Not set",
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
    male: "Мужской",
    female: "Женский",
    both: "Оба",
    year: "лет",
    archetypeNotSet: "Не установлено",
    mbtiNotSet: "Не установлено",
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
    male: "ذكر",
    female: "أنثى",
    both: "كلاهما",
    year: "سنة",
    archetypeNotSet: "غير محدد",
    mbtiNotSet: "غير محدد",
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

export async function getSharedStrings(
  userId: number | undefined,
  botName: string
): Promise<ISharedStrings> {
  const language = await getLanguageForUser(userId, botName);
  return translations[language] || translations[Language.Persian];
}

