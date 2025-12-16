import {
  INMANKIST_BOT_USERNAME,
  MAX_COMPLETION_SCORE,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_INTERESTS,
  MIN_COMPLETION_THRESHOLD,
} from "../shared/constants";
import { getProfileStringsSync } from "../shared/i18n/profileStrings";
import { Language } from "../shared/types";

const defaultProfileStrings = getProfileStringsSync(Language.Persian);
const {
  errors: sharedErrors,
  success: sharedSuccess,
  profileValues: sharedProfileValues,
  buttons: sharedButtons,
  editPrompts: sharedEditPrompts,
} = defaultProfileStrings;

// Helper function to format welcome message with dynamic values
export function getWelcomeMessage(completionScore: number): string {
  return `🎉 به ربات وایبز خوش اومدی! 

✨ اینجا یه فضای متفاوت و امن برای پیدا کردن دوست یا پارتنر هست. برخلاف ربات‌های دیگه، اینجا فقط و فقط دوستیابی سالم و واقعی رو دنبال می‌کنیم.

💫 هیچ محدودیتی وجود نداره و می‌تونی با بهترین افراد مچ بشی که دقیقا همون چیزی هستن که تو دنبالشی.

🤝 هر رفتاری خارج از این محدوده، سریع گزارش و بررسی میشه تا فضای سالم و امنی برای همه حفظ بشه.

برای اینکه بهترین افراد رو برای دوستی بهت پیشنهاد کنم، باید تست‌های شخصیت‌شناسی رو در ربات @${INMANKIST_BOT_USERNAME} پاس کنی:
• تست کهن الگو (Archetype)
• تست MBTI

📊 وضعیت تکمیل پروفایل: ${completionScore}/${MAX_COMPLETION_SCORE}`;
}

// Error messages
export const errors = {
  ...sharedErrors,
  startFirst: "لطفا ابتدا با دستور /start شروع کنید.",
  missingRequiredFields: (fields: string[]) =>
    `برای استفاده از این دستور، باید فیلدهای اجباری زیر را تکمیل کنید:\n\n` +
    `❌ ${fields.join("\n❌ ")}\n\n` +
    `از دستور /profile برای ویرایش پروفایل استفاده کنید.`,
  incompleteProfile: (score: number) =>
    `برای استفاده از این دستور، باید حداقل ${MIN_COMPLETION_THRESHOLD} مورد از ${MAX_COMPLETION_SCORE} مورد پروفایل خود را تکمیل کنید.\nوضعیت فعلی: ${score}/${MAX_COMPLETION_SCORE}\nاز دستور /profile برای مشاهده و تکمیل پروفایل استفاده کنید.`,
  rateLimit: (minutes: number) =>
    `⏰ شما می‌توانید هر ساعت یک بار از این دستور استفاده کنید.\nزمان باقی‌مانده: ${minutes} دقیقه`,
  noMatches: "شما تمام افراد موجود را دیده‌اید. لطفا بعدا دوباره تلاش کنید!",
  noLikes: "هنوز کسی شما را لایک نکرده است.",
  reportFailed: "❌ خطا در ثبت گزارش. لطفا دوباره تلاش کنید.",
  cannotLikeSelf: "شما نمی‌توانید خودتان را لایک کنید!",
  cannotReportSelf: "شما نمی‌توانید خودتان را گزارش دهید!",
  userNotFound: "کاربر یافت نشد",
  deleteFailed: "❌ خطا در حذف اطلاعات. لطفا دوباره تلاش کنید.",
  // Command errors
  getProfileFailed: "❌ خطا در دریافت پروفایل. لطفا دوباره تلاش کنید.",
  commandFailed: "❌ خطا در اجرای دستور. لطفا دوباره تلاش کنید.",
  findFailed: "❌ خطا در پیدا کردن افراد. لطفا دوباره تلاش کنید.",
  likedFailed: "❌ خطا در دریافت لیست لایک‌ها. لطفا دوباره تلاش کنید.",
  settingsFailed: "❌ خطا در نمایش تنظیمات. لطفا دوباره تلاش کنید.",
  accessDenied: "❌ دسترسی محدود",
  statsFailed: "⚠️ خطا در دریافت آمار. لطفا دوباره تلاش کنید.",
  // Callback errors
  likeActionFailed: "❌ خطا در ثبت لایک",
  deleteLikedFailed: "❌ خطا",
  reportsFailed: "❌ خطا در دریافت گزارش‌ها",
  usersFailed: "❌ خطا در دریافت کاربران",
};

// Success messages
export const success = {
  ...sharedSuccess,
  likeRegistered: "✅ لایک ثبت شد!",
  mutualLike: "🎉 مچ شدید! هر دو شما یکدیگر را لایک کردید!",
  reportSubmitted: "✅ گزارش شما ثبت شد و به ادمین ارسال شد.",
  matchesFound: (count: number) => `✅ ${count} نفر پیدا شد!`,
  dataDeleted: "✅ تمام اطلاعات شما با موفقیت حذف شد.",
};

// Field labels
export const fields = {
  username: "نام کاربری",
  displayName: "نام نمایشی",
  gender: "جنسیت",
  lookingForGender: "پیشنهاد (جنسیت مورد نظر)",
  birthDate: "تاریخ تولد",
  notSet: "ثبت نشده",
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
  mood: "😊 مود",
  interests: "🎯 علایق",
  location: "📍 استان",
  completion: "📊 تکمیل",
};

// Profile field values
export const profileValues = sharedProfileValues;

// Button labels
export const buttons = sharedButtons;

// Profile editing prompts
export const editPrompts = sharedEditPrompts;

// Report messages
export const report = {
  prompt: "لطفا دلیل گزارش را ارسال کنید (یا /cancel برای لغو):",
  cancelled: "گزارش لغو شد.",
};

// Delete data messages
export const deleteData = {
  confirmPrompt:
    "⚠️ <b>هشدار: حذف کامل اطلاعات</b>\n\n" +
    "آیا مطمئن هستید که می‌خواهید تمام اطلاعات خود را حذف کنید؟\n\n" +
    "این عمل شامل موارد زیر است:\n" +
    "• پروفایل شما\n" +
    "• تمام لایک‌های شما\n" +
    "• تمام لایک‌های دریافتی\n" +
    "• تمام گزارش‌ها\n" +
    "• تمام اطلاعات دیگر\n\n" +
    "⚠️ این عمل غیرقابل بازگشت است!",
  cancelled: "❌ حذف اطلاعات لغو شد.",
  buttons: {
    confirm: "✅ بله، حذف کن",
    cancel: "❌ لغو",
  },
};

// Settings
export const settings = {
  title: "⚙️ تنظیمات:\n\n",
  wipeDataButton: "🗑️ حذف کامل اطلاعات",
};

// Display messages
export const display = {
  unknownAge: "نامشخص",
  noName: "بدون نام",
  noBio: "بیوگرافی ثبت نشده",
  usernameNotSet: "نام کاربری ثبت نشده",
  allLikedSeen: "تمام افرادی که شما را لایک کرده‌اند را دیده‌اید.",
  unknownPerson: "یک نفر",
};

// Callback query responses
export const callbacks = {
  likeRegistered: "✅ لایک ثبت شد!",
  mutualLike: "🎉 مچ شدید! هر دو شما یکدیگر را لایک کردید!",
  disliked: "✅ رد شد",
  deleted: "✅ حذف شد",
};

// General messages
export const general = {
  useButtonsBelow: "✨ می‌تونی از دکمه‌های زیر استفاده کنی:",
};

// Admin messages
export const admin = {
  buttons: {
    reports: "📋 Reports",
    users: "👥 Users",
  },
  panelTitle: "🔐 <b>Admin Panel</b>",
  statisticsTitle: "📊 <b>Statistics</b>",
  statsMessage: (
    totalUsers: number,
    newUsers: number,
    completedProfiles: number,
    totalLikes: number,
    mutualLikes: number,
    totalReports: number,
    minCompletion: number
  ) =>
    `${admin.panelTitle}\n\n` +
    `${admin.statisticsTitle}\n` +
    `👥 Users: ${totalUsers.toLocaleString("en-US")} (24h: ${newUsers.toLocaleString("en-US")})\n` +
    `✅ Completed (>=${minCompletion}%): ${completedProfiles.toLocaleString("en-US")}\n` +
    `❤️ Likes: ${totalLikes.toLocaleString("en-US")}\n` +
    `🤝 Matches (mutual likes): ${mutualLikes.toLocaleString("en-US")}\n` +
    `🚫 Reports: ${totalReports.toLocaleString("en-US")}`,
  chartTitle: (days: number) => `Users & DAU (last ${days} days)`,
  chartLabels: {
    activeUsers: "Daily Active Users",
    totalUsers: "Total Users",
  },
  noReports: "📋 هیچ گزارشی ثبت نشده است.",
  reportsTitle: (count: number) => `📋 <b>Reports (${count})</b>`,
  noUsers: "👥 هیچ کاربری ثبت نشده است.",
  allUsersTitle: (count: number) => `👥 <b>All Users (${count})</b>`,
  reportLabels: {
    reporter: "👤 <b>Reporter:</b>",
    reported: "🚫 <b>Reported:</b>",
    reason: "📝 <b>Reason:</b>",
    date: "📅 <b>Date:</b>",
  },
  noReason: "بدون دلیل",
  userPrefix: "User",
};

// Notification messages
export const notifications = {
  newLike: (likerName: string) =>
    `❤️ <b>کسی شما را لایک کرد!</b>\n\n` +
    `${likerName} شما را لایک کرده است.\n\n` +
    `از دستور /liked برای مشاهده افرادی که شما را لایک کرده‌اند استفاده کنید.`,
  profileReminder: (completionScore: number) =>
    `📝 <b>یادآوری به‌روزرسانی پروفایل</b>\n\n` +
    `پروفایل شما ${completionScore}/${MAX_COMPLETION_SCORE} تکمیل شده است.\n\n` +
    `✨ با تکمیل پروفایل خود، شانس بیشتری برای پیدا کردن افراد مرتبط و مناسب خواهید داشت!\n\n` +
    `از دستور /profile برای ویرایش و تکمیل پروفایل استفاده کنید.`,
};

// Profile completion messages
export const profileCompletion = {
  welcome: "برای شروع، باید چند فیلد اجباری رو تکمیل کنی:",
  nextField: (fieldName: string, remaining: number) =>
    `✅ فیلد قبلی ثبت شد!\n\n` +
    `📝 فیلد بعدی: ${fieldName}\n` +
    `(${remaining} فیلد باقی مانده)`,
  allRequiredComplete:
    "🎉 تبریک! تمام فیلدهای اجباری تکمیل شدند!\n\nحالا می‌تونی از تمام امکانات ربات استفاده کنی!",
  fieldPrompt: {
    username:
      "🔗 لطفا نام کاربری تلگرام خود را تنظیم کنید و سپس دکمه زیر را بزنید:",
    displayName: `👤 لطفا نام نمایشی خود را ارسال کنید (حداکثر ${MAX_DISPLAY_NAME_LENGTH} کاراکتر):\n\nبرای لغو: /cancel`,
    gender: "⚧️ جنسیت خود را انتخاب کنید:",
    lookingFor: "🤝 می‌خواهید چه کسی به شما پیشنهاد شود؟",
    birthDate:
      "🎂 لطفا تاریخ تولد خود را به فرمت YYYY-MM-DD ارسال کنید (مثال: 1995-05-15):\n\nبرای لغو: /cancel",
    interests: `🎯 لطفا حداقل ${MIN_INTERESTS} علاقه انتخاب کنید:`,
  },
};
