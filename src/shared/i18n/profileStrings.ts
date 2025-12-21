import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_INTERESTS,
  MIN_INTERESTS,
  MIN_AGE,
  MAX_AGE,
} from "../constants";
import { Language } from "../types";
import { getLanguageForUser } from "./language";

export interface IProfileStrings {
  errors: {
    editCancelled: string;
    nameTooLong: string;
    bioTooLong: string;
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
    ageUpdated: (age: number) => string;
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
  moodOptions: {
    happy: string;
    sad: string;
    tired: string;
    cool: string;
    thinking: string;
    excited: string;
    calm: string;
    angry: string;
    neutral: string;
    playful: string;
  };
  buttons: {
    editProfile: string;
    completionStatus: string;
    findPeople: string;
    takeQuizzes: string;
    editName: string;
    editBio: string;
    editAge: string;
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
    ban: string;
    previous: string;
    next: string;
    addImage: string;
    clearImage: string;
  };
  editPrompts: {
    name: string;
    bio: string;
    age: string;
    gender: string;
    lookingFor: string;
    image: {
      hasImage: () => string;
      noImage: string;
    };
    mood: string;
    interests: (
      selectedCount: number,
      currentPage: number,
      totalPages: number
    ) => string;
    location: (currentPage: number, totalPages: number) => string;
    locationSelected: (
      provinceName: string,
      currentPage: number,
      totalPages: number
    ) => string;
    photo: string;
  };
}

const profileTranslations: { [key in Language]: IProfileStrings } = {
  [Language.Persian]: {
    errors: {
      editCancelled: "❌ ویرایش لغو شد.",
      nameTooLong: `❌ نام نمایشی نمی‌تواند بیشتر از ${MAX_DISPLAY_NAME_LENGTH} کاراکتر باشد.`,
      bioTooLong: "❌ بیوگرافی نمی‌تواند بیشتر از 500 کاراکتر باشد.",
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
      ageUpdated: (age: number) =>
        `✅ تاریخ تولد ثبت شد. سن شما: ${age} سال`,
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
    moodOptions: {
      happy: "خوشحال",
      sad: "غمگین",
      tired: "خسته",
      cool: "باحال",
      thinking: "در حال فکر",
      excited: "هیجان‌زده",
      calm: "آرام",
      angry: "عصبانی",
      neutral: "خنثی",
      playful: "بازیگوش",
    },
    buttons: {
      editProfile: "📝 ویرایش پروفایل",
      completionStatus: "📊 وضعیت تکمیل پروفایل",
      findPeople: "🔍 پیدا کردن افراد",
      takeQuizzes: "🧪 انجام تست‌ها",
      editName: "✏️ ویرایش نام",
      editBio: "📝 ویرایش بیوگرافی",
      editAge: "🎂 سن",
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
      ban: "🚫 بن",
      previous: "◀️ قبلی",
      next: "بعدی ▶️",
      addImage: "➕ افزودن/تغییر تصویر",
      clearImage: "🗑️ حذف تصویر",
    },
    editPrompts: {
      name: `لطفا نام نمایشی خود را ارسال کنید (حداکثر ${MAX_DISPLAY_NAME_LENGTH} کاراکتر):\n\nبرای لغو: /cancel`,
      bio: "لطفا بیوگرافی خود را ارسال کنید (حداکثر 500 کاراکتر):\n\n📝 تعداد کاراکتر: 0/500\n\nبرای لغو: /cancel",
      age:
        "لطفا سن خود را به صورت عدد ارسال کنید (مثال: 25):\n\nبرای لغو: /cancel",
      gender: "جنسیت خود را انتخاب کنید:",
      lookingFor: "می‌خواهید چه کسی به شما پیشنهاد شود؟",
      image: {
        hasImage: () =>
          `شما یک تصویر دارید.\n\nبرای تغییر تصویر، یک عکس جدید ارسال کنید (تصویر قبلی جایگزین می‌شود).\nبرای حذف تصویر، از دکمه زیر استفاده کنید.`,
        noImage:
          "شما هنوز تصویری ندارید.\n\nبرای افزودن تصویر، یک عکس ارسال کنید:\n\n⚠️ فقط می‌توانید 1 تصویر داشته باشید.\n\nبرای لغو: /cancel",
      },
      mood: "مود خود را انتخاب کنید:",
      interests: (
        selectedCount: number,
        currentPage: number,
        totalPages: number
      ) =>
        `🎯 علایق خود را انتخاب کنید (${selectedCount}/${MAX_INTERESTS} مورد انتخاب شده)\nصفحه ${currentPage}/${totalPages}\n\nبرای انتخاب/لغو انتخاب هر مورد، روی آن کلیک کنید. تغییرات به صورت خودکار ذخیره می‌شوند.\n\n⚠️ باید حداقل ${MIN_INTERESTS} و حداکثر ${MAX_INTERESTS} علاقه انتخاب کنید.`,
      location: (currentPage: number, totalPages: number) =>
        `📍 استان خود را انتخاب کنید\nصفحه ${currentPage}/${totalPages}\n\nبرای انتخاب استان، روی آن کلیک کنید.`,
      locationSelected: (
        provinceName: string,
        currentPage: number,
        totalPages: number
      ) =>
        `📍 استان خود را انتخاب کنید\n✅ انتخاب شده: ${provinceName}\nصفحه ${currentPage}/${totalPages}\n\nبرای تغییر استان، روی استان دیگری کلیک کنید.`,
      photo: "لطفا یک عکس ارسال کنید:\n\nبرای لغو: /cancel",
    },
  },
  [Language.English]: {
    errors: {
      editCancelled: "❌ Edit cancelled.",
      nameTooLong: `❌ Display name cannot be longer than ${MAX_DISPLAY_NAME_LENGTH} characters.`,
      bioTooLong: "❌ Biography cannot exceed 500 characters.",
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
      ageUpdated: (age: number) => `✅ Age saved. Your age: ${age}.`,
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
    moodOptions: {
      happy: "Happy",
      sad: "Sad",
      tired: "Tired",
      cool: "Cool",
      thinking: "Thinking",
      excited: "Excited",
      calm: "Calm",
      angry: "Angry",
      neutral: "Neutral",
      playful: "Playful",
    },
    buttons: {
      editProfile: "📝 Edit Profile",
      completionStatus: "📊 Profile Completion",
      findPeople: "🔍 Find People",
      takeQuizzes: "🧪 Take Quizzes",
      editName: "✏️ Edit Name",
      editBio: "📝 Edit Biography",
      editAge: "🎂 Age",
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
      ban: "🚫 Ban",
      previous: "◀️ Previous",
      next: "Next ▶️",
      addImage: "➕ Add/Change Image",
      clearImage: "🗑️ Remove Image",
    },
    editPrompts: {
      name: `Please send your display name (max ${MAX_DISPLAY_NAME_LENGTH} characters):\n\nTo cancel: /cancel`,
      bio: "Please send your biography (max 500 characters):\n\n📝 Characters: 0/500\n\nTo cancel: /cancel",
      age:
        "Please send your age as a number (e.g., 25):\n\nTo cancel: /cancel",
      gender: "Choose your gender:",
      lookingFor: "Who do you want to be suggested?",
      image: {
        hasImage: () =>
          `You already have an image.\n\nSend a new photo to replace it.\nUse the button below to remove your current image.`,
        noImage:
          "You don't have an image yet.\n\nSend a photo to add one:\n\n⚠️ You can only have 1 image.\n\nTo cancel: /cancel",
      },
      mood: "Choose your mood:",
      interests: (
        selectedCount: number,
        currentPage: number,
        totalPages: number
      ) =>
        `🎯 Select your interests (${selectedCount}/${MAX_INTERESTS} selected)\nPage ${currentPage}/${totalPages}\n\nTap to toggle. Changes save automatically.\n\n⚠️ You must select at least ${MIN_INTERESTS} and at most ${MAX_INTERESTS}.`,
      location: (currentPage: number, totalPages: number) =>
        `📍 Choose your province\nPage ${currentPage}/${totalPages}\n\nTap a province to select.`,
      locationSelected: (
        provinceName: string,
        currentPage: number,
        totalPages: number
      ) =>
        `📍 Choose your province\n✅ Selected: ${provinceName}\nPage ${currentPage}/${totalPages}\n\nTap another province to change.`,
      photo: "Please send a photo:\n\nTo cancel: /cancel",
    },
  },
  [Language.Russian]: {
    errors: {
      editCancelled: "❌ Редактирование отменено.",
      nameTooLong: `❌ Имя не может быть длиннее ${MAX_DISPLAY_NAME_LENGTH} символов.`,
      bioTooLong: "❌ Биография не может превышать 500 символов.",
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
      ageUpdated: (age: number) =>
        `✅ Дата рождения сохранена. Ваш возраст: ${age}.`,
      genderUpdated: (gender: string) => `✅ Пол изменён на «${gender}».`,
      lookingForUpdated: (text: string) =>
        `✅ Предпочтение изменено на «${text}».`,
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
    moodOptions: {
      happy: "Счастлив",
      sad: "Грустно",
      tired: "Устал",
      cool: "Круто",
      thinking: "Думаю",
      excited: "В восторге",
      calm: "Спокоен",
      angry: "Злюсь",
      neutral: "Нейтрален",
      playful: "Игривый",
    },
    buttons: {
      editProfile: "📝 Редактировать профиль",
      completionStatus: "📊 Заполненность профиля",
      findPeople: "🔍 Найти людей",
      takeQuizzes: "🧪 Пройти тесты",
      editName: "✏️ Имя",
      editBio: "📝 Биография",
      editAge: "🎂 Возраст",
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
      ban: "🚫 Заблокировать",
      previous: "◀️ Назад",
      next: "Далее ▶️",
      addImage: "➕ Добавить/сменить фото",
      clearImage: "🗑️ Удалить фото",
    },
    editPrompts: {
      name: `Отправьте имя (макс. ${MAX_DISPLAY_NAME_LENGTH} символов):\n\nОтмена: /cancel`,
      bio: "Отправьте биографию (макс. 500 символов):\n\n📝 Символы: 0/500\n\nОтмена: /cancel",
      age:
        "Отправьте ваш возраст числом (например, 25):\n\nОтмена: /cancel",
      gender: "Выберите пол:",
      lookingFor: "Кого вы хотите видеть в рекомендациях?",
      image: {
        hasImage: () =>
          `У вас уже есть фото.\n\nОтправьте новое, чтобы заменить.\nИспользуйте кнопку ниже, чтобы удалить текущее фото.`,
        noImage:
          "У вас ещё нет фото.\n\nОтправьте фото, чтобы добавить его.\n\n⚠️ Можно иметь только 1 фото.\n\nОтмена: /cancel",
      },
      mood: "Выберите настроение:",
      interests: (
        selectedCount: number,
        currentPage: number,
        totalPages: number
      ) =>
        `🎯 Выберите интересы (${selectedCount}/${MAX_INTERESTS})\nСтраница ${currentPage}/${totalPages}\n\nНажмите, чтобы переключить. Изменения сохраняются автоматически.\n\n⚠️ Минимум ${MIN_INTERESTS}, максимум ${MAX_INTERESTS}.`,
      location: (currentPage: number, totalPages: number) =>
        `📍 Выберите провинцию\nСтраница ${currentPage}/${totalPages}\n\nНажмите на провинцию, чтобы выбрать.`,
      locationSelected: (
        provinceName: string,
        currentPage: number,
        totalPages: number
      ) =>
        `📍 Выберите провинцию\n✅ Выбрано: ${provinceName}\nСтраница ${currentPage}/${totalPages}\n\nНажмите другую провинцию, чтобы изменить.`,
      photo: "Пожалуйста، отправьте фото:\n\nОтмена: /cancel",
    },
  },
  [Language.Arabic]: {
    errors: {
      editCancelled: "❌ تم إلغاء التعديل.",
      nameTooLong: `❌ لا يمكن أن يتجاوز الاسم ${MAX_DISPLAY_NAME_LENGTH} حرفًا.`,
      bioTooLong: "❌ لا يمكن أن تتجاوز السيرة الذاتية 500 حرف.",
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
      ageUpdated: (age: number) => `✅ تم حفظ تاريخ الميلاد. عمرك: ${age}.`,
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
    moodOptions: {
      happy: "سعيد",
      sad: "حزين",
      tired: "متعب",
      cool: "كول",
      thinking: "أفكر",
      excited: "متحمس",
      calm: "هادئ",
      angry: "غاضب",
      neutral: "محايد",
      playful: "لعوب",
    },
    buttons: {
      editProfile: "📝 تعديل الملف",
      completionStatus: "📊 اكتمال الملف",
      findPeople: "🔍 ابحث عن أشخاص",
      takeQuizzes: "🧪 إجراء الاختبارات",
      editName: "✏️ تعديل الاسم",
      editBio: "📝 تعديل السيرة",
      editAge: "🎂 العمر",
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
      ban: "🚫 حظر",
      previous: "◀️ السابق",
      next: "التالي ▶️",
      addImage: "➕ إضافة/تغيير الصورة",
      clearImage: "🗑️ حذف الصورة",
    },
    editPrompts: {
      name: `أرسل اسم العرض (بحد أقصى ${MAX_DISPLAY_NAME_LENGTH} حرفًا):\n\nللإلغاء: /cancel`,
      bio: "أرسل سيرتك الذاتية (بحد أقصى 500 حرف):\n\n📝 عدد الأحرف: 0/500\n\nللإلغاء: /cancel",
      age:
        "أرسل عمرك كرقم (مثال: 25):\n\nللإلغاء: /cancel",
      gender: "اختر جنسك:",
      lookingFor: "من تريد أن يتم اقتراحه لك؟",
      image: {
        hasImage: () =>
          `لديك صورة بالفعل.\n\nأرسل صورة جديدة لاستبدالها.\nاستخدم الزر أدناه لحذف صورتك الحالية.`,
        noImage:
          "ليس لديك صورة بعد.\n\nأرسل صورة لإضافتها:\n\n⚠️ يمكنك امتلاك صورة واحدة فقط.\n\nللإلغاء: /cancel",
      },
      mood: "اختر مزاجك:",
      interests: (
        selectedCount: number,
        currentPage: number,
        totalPages: number
      ) =>
        `🎯 اختر اهتماماتك (${selectedCount}/${MAX_INTERESTS})\nالصفحة ${currentPage}/${totalPages}\n\nاضغط للتبديل. يتم الحفظ تلقائيًا.\n\n⚠️ يجب اختيار ما لا يقل عن ${MIN_INTERESTS} ولا يزيد عن ${MAX_INTERESTS}.`,
      location: (currentPage: number, totalPages: number) =>
        `📍 اختر محافظتك\nالصفحة ${currentPage}/${totalPages}\n\nاضغط على المحافظة للاختيار.`,
      locationSelected: (
        provinceName: string,
        currentPage: number,
        totalPages: number
      ) =>
        `📍 اختر محافظتك\n✅ المختارة: ${provinceName}\nالصفحة ${currentPage}/${totalPages}\n\nاضغط محافظة أخرى للتغيير.`,
      photo: "يرجى إرسال صورة:\n\nللإلغاء: /cancel",
    },
  },
};

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

