import { Bot, Context, InlineKeyboard } from "grammy";
import { getQuestion } from ".";
import { toPercentage } from "../../utils/string";
import { quizModes } from "../config";
import { getStringsForUser } from "../i18n";
import { getUserLanguage } from "../../shared/i18n";
import { Language } from "../../shared/types";
import { IUserData, QuizType } from "../types";
import styles from "./styles";
import { CognitiveStyle, ResultType } from "./types";

export function setCustomCommands(bot: Bot) {
  // No custom commands needed for left/right test
  return bot;
}

export async function replyAbout(ctx: Context) {
  const userId = ctx.from?.id;
  const language = await getUserLanguage(userId);
  const keyboard = new InlineKeyboard();
  
  Object.values(ResultType).forEach((type) => {
    keyboard.text(
      styles[type].emoji + " " + styles[type].name[language],
      `detail:${QuizType.LeftRight}:${type}`
    );
    keyboard.row();
  });

  const aboutText = {
    [Language.Persian]: [
      "آزمون سبک شناختی به شما نشان می‌دهد که سبک تفکر غالب شما چیست.",
      "",
      "⚠️ توجه: این آزمون سبک‌های شناختی مختلف را می‌سنجد، نه عملکرد مغز.",
      "هر دو نیمکره مغز در اکثر فعالیت‌ها با هم کار می‌کنند.",
    ],
    [Language.English]: [
      "The cognitive style test shows you what your dominant thinking style is.",
      "",
      "⚠️ Note: This test measures different cognitive styles, not brain function.",
      "Both brain hemispheres work together in most activities.",
    ],
    [Language.Russian]: [
      "Тест когнитивного стиля показывает вам, каков ваш доминирующий стиль мышления.",
      "",
      "⚠️ Примечание: Этот тест измеряет различные когнитивные стили, а не функцию мозга.",
      "Оба полушария мозга работают вместе в большинстве видов деятельности.",
    ],
    [Language.Arabic]: [
      "اختبار الأسلوب المعرفي يوضح لك ما هو أسلوب تفكيرك السائد.",
      "",
      "⚠️ ملاحظة: يقيس هذا الاختبار أنماط معرفية مختلفة، وليس وظيفة الدماغ.",
      "كلا نصفي الدماغ يعملان معا في معظم الأنشطة.",
    ],
  };

  await ctx.reply(aboutText[language].join("\n"), { reply_markup: keyboard });
}

function determineResultType(
  leftScore: number,
  rightScore: number,
  totalQuestions: number
): ResultType {
  const leftPercentage = (leftScore / (leftScore + rightScore)) * 100;

  if (leftPercentage >= 70) return ResultType.StrongLeft;
  if (leftPercentage >= 55) return ResultType.Left;
  if (leftPercentage >= 45) return ResultType.Balanced;
  if (leftPercentage >= 30) return ResultType.Right;
  return ResultType.StrongRight;
}

export function calculateResult(user: IUserData): ResultType {
  // Calculate scores for each cognitive style
  let leftScore = 0;
  let rightScore = 0;

  Object.entries(user.answers).forEach((answer) => {
    const index = parseInt(answer[0]);
    const question = getQuestion(user, index);
    if (!question) throw "Something went wrong!";
    const value = answer[1];

    if (question.belong === CognitiveStyle.Left) {
      leftScore += value;
    } else {
      rightScore += value;
    }
  });

  // Determine result type
  const totalQuestions = user.order.length;
  const resultType = determineResultType(leftScore, rightScore, totalQuestions);
  return resultType;
}

export async function replyResult(ctx: Context, user: IUserData, resultType: ResultType) {
  const style = styles[resultType];
  const language = user.language || Language.Persian;
  
  // Recalculate scores for display
  let leftScore = 0;
  let rightScore = 0;
  Object.entries(user.answers).forEach((answer) => {
    const index = parseInt(answer[0]);
    const question = getQuestion(user, index);
    if (!question) throw "Something went wrong!";
    const value = answer[1];
    if (question.belong === CognitiveStyle.Left) {
      leftScore += value;
    } else {
      rightScore += value;
    }
  });

  // Calculate percentages
  const total = leftScore + rightScore;
  const leftPercentage = total > 0 ? Math.round((leftScore / total) * 100) : 50;
  const rightPercentage = total > 0 ? Math.round((rightScore / total) * 100) : 50;

  const labels = {
    [Language.Persian]: { traits: "ویژگی‌های شما", distribution: "توزیع سبک شناختی", analytical: "تحلیلی", creative: "خلاق" },
    [Language.English]: { traits: "Your Traits", distribution: "Cognitive Style Distribution", analytical: "Analytical", creative: "Creative" },
    [Language.Russian]: { traits: "Ваши черты", distribution: "Распределение когнитивного стиля", analytical: "Аналитический", creative: "Творческий" },
    [Language.Arabic]: { traits: "سماتك", distribution: "توزيع النمط المعرفي", analytical: "تحليلي", creative: "إبداعي" },
  };

  // Create message
  const resultText = [
    `${style.emoji} *${style.name[language]}*`,
    "",
    style.description[language],
    "",
    `🎯 *${labels[language].traits}:*`,
    ...style.traits[language].map((trait) => `  ${trait}`),
    "",
    `📊 *${labels[language].distribution}:*`,
    `  📐 ${labels[language].analytical}: ${leftPercentage}%`,
    `  🎨 ${labels[language].creative}: ${rightPercentage}%`,
  ].join("\n");

  // Add button for detailed view
  const userId = ctx.from?.id;
  const strings = await getStringsForUser(userId);
  const keyboard = new InlineKeyboard().text(
    `${strings.about} سبک ${style.name[language]}`,
    `detail:${QuizType.LeftRight}:${resultType}`
  );

  await ctx.reply(resultText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

export async function replyDetail(ctx: Context, key: ResultType) {
  const userId = ctx.from?.id;
  const language = await getUserLanguage(userId);
  const style = styles[key];
  if (!style) throw "Cognitive style not found!";

  const labels = {
    [Language.Persian]: "ویژگی‌ها",
    [Language.English]: "Traits",
    [Language.Russian]: "Черты",
      [Language.Arabic]: "Черты",
  };

  const message = [
    `${style.emoji} *${style.name[language]}*`,
    "",
    style.description[language],
    "",
    `*${labels[language]}:*`,
    ...style.traits[language].map((trait) => `  ${trait}`),
  ].join("\n");

  ctx.reply(message, { parse_mode: "Markdown" });
}

