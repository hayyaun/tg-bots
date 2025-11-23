import { Bot, Context, InlineKeyboard } from "grammy";
import _ from "lodash";
import { getQuestion } from ".";
import { quizModes } from "../config";
import { getUserLanguage } from "../i18n";
import strings from "../strings";
import { IUserData, Language, QuizType } from "../types";
import personalities from "./personalities";
import { Dimension, MBTIType } from "./types";

export function setCustomCommands(bot: Bot) {
  // No custom commands needed for MBTI
  return bot;
}

export async function replyAbout(ctx: Context) {
  const userId = ctx.from?.id;
  const language = getUserLanguage(userId);
  const keyboard = new InlineKeyboard();
  const types = [
    [MBTIType.INTJ, MBTIType.INTP, MBTIType.ENTJ, MBTIType.ENTP],
    [MBTIType.INFJ, MBTIType.INFP, MBTIType.ENFJ, MBTIType.ENFP],
    [MBTIType.ISTJ, MBTIType.ISFJ, MBTIType.ESTJ, MBTIType.ESFJ],
    [MBTIType.ISTP, MBTIType.ISFP, MBTIType.ESTP, MBTIType.ESFP],
  ];

  types.forEach((row) => {
    row.forEach((type) => {
      keyboard.text(type.toUpperCase(), `detail:${QuizType.MBTI}:${type}`);
    });
    keyboard.row();
  });

  const aboutText = {
    [Language.Persian]: "آزمون MBTI (مایرز-بریگز) شخصیت شما را در یکی از ۱۶ تیپ شخصیتی مشخص می‌کند. این آزمون بر اساس نظریه‌های کارل یونگ طراحی شده و یکی از معتبرترین آزمون‌های شخصیت‌شناسی است.",
    [Language.English]: "The MBTI (Myers-Briggs) test identifies your personality as one of 16 personality types. This test is based on Carl Jung's theories and is one of the most reliable personality tests.",
    [Language.Russian]: "Тест MBTI (Майерс-Бриггс) определяет вашу личность как один из 16 типов личности. Этот тест основан на теориях Карла Юнга и является одним из самых надежных тестов личности.",
  };

  await ctx.reply(aboutText[language], { reply_markup: keyboard });
}

function calculateMBTIType(dimensionScores: Map<Dimension, number>): MBTIType {
  // Calculate which dimension wins in each pair
  const ei =
    (dimensionScores.get(Dimension.E) || 0) >
    (dimensionScores.get(Dimension.I) || 0)
      ? "E"
      : "I";
  const sn =
    (dimensionScores.get(Dimension.S) || 0) >
    (dimensionScores.get(Dimension.N) || 0)
      ? "S"
      : "N";
  const tf =
    (dimensionScores.get(Dimension.T) || 0) >
    (dimensionScores.get(Dimension.F) || 0)
      ? "T"
      : "F";
  const jp =
    (dimensionScores.get(Dimension.J) || 0) >
    (dimensionScores.get(Dimension.P) || 0)
      ? "J"
      : "P";

  const typeString = `${ei}${sn}${tf}${jp}`.toLowerCase();
  return typeString as MBTIType;
}

function getDimensionPercentages(
  dimensionScores: Map<Dimension, number>,
  totalQuestions: number
): { dimension: string; percentage: number }[] {
  const pairs = [
    [Dimension.E, Dimension.I],
    [Dimension.S, Dimension.N],
    [Dimension.T, Dimension.F],
    [Dimension.J, Dimension.P],
  ];

  return pairs.map(([dim1, dim2]) => {
    const score1 = dimensionScores.get(dim1) || 0;
    const score2 = dimensionScores.get(dim2) || 0;
    const total = score1 + score2;

    if (total === 0) {
      return { dimension: `${dim1}-${dim2}`, percentage: 50 };
    }

    const winner = score1 > score2 ? dim1 : dim2;
    const winnerScore = Math.max(score1, score2);
    const percentage = Math.round((winnerScore / total) * 100);

    return { dimension: winner, percentage };
  });
}

export async function replyResult(ctx: Context, user: IUserData) {
  // Calculate scores for each dimension
  const dimensionScores = new Map<Dimension, number>();

  Object.entries(user.answers).forEach((answer) => {
    const index = parseInt(answer[0]);
    const question = getQuestion(user, index);
    if (!question) throw "Something went wrong!";
    const value = answer[1];
    const previous = dimensionScores.get(question.belong);
    dimensionScores.set(question.belong, (previous ?? 0) + value);
  });

  // Determine MBTI type
  const mbtiType = calculateMBTIType(dimensionScores);
  const personality = personalities[mbtiType];
  const language = user.language || Language.Persian;

  // Calculate percentages for display
  const totalQuestions = user.order.length;
  const percentages = getDimensionPercentages(dimensionScores, totalQuestions);

  const labels = {
    [Language.Persian]: { type: "تیپ شخصیتی شما", distribution: "توزیع ابعاد شخصیتی" },
    [Language.English]: { type: "Your Personality Type", distribution: "Personality Dimension Distribution" },
    [Language.Russian]: { type: "Ваш тип личности", distribution: "Распределение измерений личности" },
  };

  // Create message
  const resultText = [
    `🎯 ${labels[language].type}: *${personality.name[language]}*`,
    ``,
    `*${personality.nickname[language]}*`,
    ``,
    personality.description[language],
    ``,
    `📊 ${labels[language].distribution}:`,
    ...percentages.map((p) => `${p.dimension}: ${p.percentage}%`),
  ].join("\n");

  // Add buttons for detailed view
  const keyboard = new InlineKeyboard().text(
    strings.show_about(`تیپ ${mbtiType.toUpperCase()}`),
    `detail:${QuizType.MBTI}:${mbtiType}`
  );

  await ctx.reply(resultText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });

  return mbtiType;
}

export async function replyDetail(ctx: Context, key: MBTIType) {
  const userId = ctx.from?.id;
  const language = getUserLanguage(userId);
  const personality = personalities[key];
  if (!personality) throw "Personality type not found!";

  const message = [
    `*${personality.name[language]}*`,
    ``,
    `*${personality.nickname[language]}*`,
    ``,
    personality.description[language],
  ].join("\n");

  ctx.reply(message, { parse_mode: "Markdown" });
}

