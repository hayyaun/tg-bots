import { Bot, Context, InlineKeyboard } from "grammy";
import _ from "lodash";
import { getQuestion } from ".";
import strings from "../strings";
import { IUserData, QuizType } from "../types";
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

  await ctx.reply(
    [
      "آزمون انیاگرام (Enneagram) شخصیت شما را در یکی از ۹ تیپ شخصیتی مشخص می‌کند.",
      "",
      "این سیستم بر اساس انگیزه‌های اصلی، ترس‌ها و آرزوهای عمیق شما طراحی شده است.",
      "",
      "💡 انیاگرام به شما کمک می‌کند خود را عمیق‌تر بشناسید.",
    ].join("\n"),
    { reply_markup: keyboard }
  );
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

  // Calculate percentages
  const totalScore = sortedResults.reduce((sum, [, score]) => sum + score, 0);
  const topPercentages = topTypes.map(([type, score]) => ({
    type,
    percentage: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
  }));

  // Create message
  const resultText = [
    `${mainDesc.emoji} *${mainDesc.name}*`,
    `_${mainDesc.nickname}_`,
    "",
    mainDesc.description,
    "",
    `🎯 ${mainDesc.coreFear}`,
    `💫 ${mainDesc.coreDesire}`,
    "",
    "*ویژگی‌های اصلی:*",
    ...mainDesc.traits.map((trait) => `  ${trait}`),
    "",
    "📊 *توزیع تیپ‌های شما:*",
    ...topPercentages.map(({ type, percentage }) => {
      const desc = descriptions[type];
      return `  ${desc.emoji} تیپ ${type.replace("type", "")}: ${percentage}%`;
    }),
  ].join("\n");

  // Add buttons for top 3 types
  const keyboard = new InlineKeyboard();
  topTypes.forEach(([type]) => {
    const desc = descriptions[type];
    keyboard.text(
      strings.show_about(`تیپ ${type.replace("type", "")}`),
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
  const desc = descriptions[key];
  if (!desc) throw "Enneagram type not found!";

  const message = [
    `${desc.emoji} *${desc.name}*`,
    `_${desc.nickname}_`,
    "",
    desc.description,
    "",
    `🎯 ${desc.coreFear}`,
    `💫 ${desc.coreDesire}`,
    "",
    "*ویژگی‌های اصلی:*",
    ...desc.traits.map((trait) => `  ${trait}`),
  ].join("\n");

  ctx.reply(message, { parse_mode: "Markdown" });
}

