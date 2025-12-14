import { Bot, Context, InlineKeyboard } from "grammy";
import _ from "lodash";
import { getQuestion } from ".";
import { getUserLanguage, getStringsForUser } from "../i18n";
import { IUserData, Language, QuizType } from "../types";
import descriptions from "./descriptions";
import { EnneagramType } from "./types";

export function setCustomCommands(bot: Bot) {
  // No custom commands needed for enneagram
  return bot;
}

export async function replyAbout(ctx: Context) {
  const keyboard = new InlineKeyboard();

  // Arrange types in 3 rows of 3
  const types = [
    [EnneagramType.Type1, EnneagramType.Type2, EnneagramType.Type3],
    [EnneagramType.Type4, EnneagramType.Type5, EnneagramType.Type6],
    [EnneagramType.Type7, EnneagramType.Type8, EnneagramType.Type9],
  ];

  types.forEach((row) => {
    row.forEach((type) => {
      const desc = descriptions[type];
      keyboard.text(
        `${desc.emoji} ${type.replace("type", "")}`,
        `detail:${QuizType.Enneagram}:${type}`
      );
    });
    keyboard.row();
  });

  const userId = ctx.from?.id;
  const language = getUserLanguage(userId);

  const aboutText = {
    [Language.Persian]: [
      "آزمون انیاگرام (Enneagram) شخصیت شما را در یکی از ۹ تیپ شخصیتی مشخص می‌کند.",
      "",
      "این سیستم بر اساس انگیزه‌های اصلی، ترس‌ها و آرزوهای عمیق شما طراحی شده است.",
      "",
      "💡 انیاگرام به شما کمک می‌کند خود را عمیق‌تر بشناسید.",
    ],
    [Language.English]: [
      "The Enneagram test identifies your personality as one of 9 personality types.",
      "",
      "This system is designed based on your core motivations, fears and deep desires.",
      "",
      "💡 The Enneagram helps you know yourself more deeply.",
    ],
    [Language.Russian]: [
      "Тест эннеаграммы определяет вашу личность как один из 9 типов личности.",
      "",
      "Эта система разработана на основе ваших основных мотиваций, страхов и глубоких желаний.",
      "",
      "💡 Эннеаграмма помогает вам узнать себя глубже.",
    ],
    [Language.Arabic]: [
      "اختبار الإنياجرام يحدد شخصيتك كواحد من 9 أنواع شخصية.",
      "",
      "تم تصميم هذا النظام بناءً على دوافعك الأساسية ومخاوفك ورغباتك العميقة.",
      "",
      "💡 يساعدك الإنياجرام على معرفة نفسك بشكل أعمق.",
    ],
  };
  
  const resolvedLanguage = await language;
  await ctx.reply(aboutText[resolvedLanguage].join("\n"), { reply_markup: keyboard });
}

export async function replyResult(ctx: Context, user: IUserData) {
  // Calculate scores for each type
  const typeScores = new Map<EnneagramType, number>();

  Object.entries(user.answers).forEach((answer) => {
    const index = parseInt(answer[0]);
    const question = getQuestion(user, index);
    if (!question) throw "Something went wrong!";
    const value = answer[1];
    const previous = typeScores.get(question.belong);
    typeScores.set(question.belong, (previous ?? 0) + value);
  });

  // Sort by scores
  const sortedResults = _.reverse(
    _.sortBy([...typeScores], ([, value]) => value)
  );

  // Get top 3 types
  const topTypes = sortedResults.slice(0, 3);
  const mainType = topTypes[0][0];
  const mainDesc = descriptions[mainType];
  const language = user.language || Language.Persian;

  // Calculate percentages
  const totalScore = sortedResults.reduce((sum, [, score]) => sum + score, 0);
  const topPercentages = topTypes.map(([type, score]) => ({
    type,
    percentage: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
  }));

  const labels = {
    [Language.Persian]: { traits: "ویژگی‌های اصلی", distribution: "توزیع تیپ‌های شما", type: "تیپ" },
    [Language.English]: { traits: "Main Traits", distribution: "Your Type Distribution", type: "Type" },
    [Language.Russian]: { traits: "Основные черты", distribution: "Распределение ваших типов", type: "Тип" },
    [Language.Arabic]: { traits: "السمات الرئيسية", distribution: "توزيع أنواعك", type: "النوع" },
  };

  // Create message
  const resultText = [
    `${mainDesc.emoji} *${mainDesc.name[language]}*`,
    `_${mainDesc.nickname[language]}_`,
    "",
    mainDesc.description[language],
    "",
    `🎯 ${mainDesc.coreFear[language]}`,
    `💫 ${mainDesc.coreDesire[language]}`,
    "",
    `*${labels[language].traits}:*`,
    ...mainDesc.traits[language].map((trait) => `  ${trait}`),
    "",
    `📊 *${labels[language].distribution}:*`,
    ...topPercentages.map(({ type, percentage }) => {
      const desc = descriptions[type];
      return `  ${desc.emoji} ${labels[language].type} ${type.replace("type", "")}: ${percentage}%`;
    }),
  ].join("\n");

  // Add buttons for top 3 types
  const userId = ctx.from?.id;
  const strings = await getStringsForUser(userId);
  const keyboard = new InlineKeyboard();
  topTypes.forEach(([type]) => {
    const desc = descriptions[type];
    keyboard.text(
      `${strings.about} تیپ ${type.replace("type", "")}`,
      `detail:${QuizType.Enneagram}:${type}`
    );
    keyboard.row();
  });

  await ctx.reply(resultText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });

  return sortedResults;
}

export async function replyDetail(ctx: Context, key: EnneagramType) {
  const userId = ctx.from?.id;
  const language = await getUserLanguage(userId);
  const desc = descriptions[key];
  if (!desc) throw "Enneagram type not found!";

  const labels = {
    [Language.Persian]: "ویژگی‌های اصلی",
    [Language.English]: "Main Traits",
    [Language.Russian]: "Основные черты",
      [Language.Arabic]: "Основные черты",
  };

  const message = [
    `${desc.emoji} *${desc.name[language]}*`,
    `_${desc.nickname[language]}_`,
    "",
    desc.description[language],
    "",
    `🎯 ${desc.coreFear[language]}`,
    `💫 ${desc.coreDesire[language]}`,
    "",
    `*${labels[language]}:*`,
    ...desc.traits[language].map((trait) => `  ${trait}`),
  ].join("\n");

  ctx.reply(message, { parse_mode: "Markdown" });
}

