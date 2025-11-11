import { Bot, Context, InlineKeyboard } from "grammy";
import { getQuestion } from ".";
import { toPercentage } from "../../utils/string";
import { quizModes } from "../config";
import strings from "../strings";
import { IUserData, QuizType } from "../types";
import styles from "./styles";
import { CognitiveStyle, ResultType } from "./types";

export function setCustomCommands(bot: Bot) {
  // No custom commands needed for left/right test
  return bot;
}

export async function replyAbout(ctx: Context) {
  const keyboard = new InlineKeyboard();
  
  Object.values(ResultType).forEach((type) => {
    keyboard.text(
      styles[type].emoji + " " + styles[type].name,
      `detail:${QuizType.LeftRight}:${type}`
    );
    keyboard.row();
  });

  await ctx.reply(
    [
      "آزمون سبک شناختی به شما نشان می‌دهد که سبک تفکر غالب شما چیست.",
      "",
      "⚠️ توجه: این آزمون سبک‌های شناختی مختلف را می‌سنجد، نه عملکرد مغز.",
      "هر دو نیمکره مغز در اکثر فعالیت‌ها با هم کار می‌کنند.",
    ].join("\n"),
    { reply_markup: keyboard }
  );
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

export async function replyResult(ctx: Context, user: IUserData) {
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
  const style = styles[resultType];

  // Calculate percentages
  const total = leftScore + rightScore;
  const leftPercentage = total > 0 ? Math.round((leftScore / total) * 100) : 50;
  const rightPercentage = total > 0 ? Math.round((rightScore / total) * 100) : 50;

  // Create message
  const resultText = [
    `${style.emoji} *${style.name}*`,
    "",
    style.description,
    "",
    "🎯 *ویژگی‌های شما:*",
    ...style.traits.map((trait) => `  ${trait}`),
    "",
    "📊 *توزیع سبک شناختی:*",
    `  📐 تحلیلی: ${leftPercentage}%`,
    `  🎨 خلاق: ${rightPercentage}%`,
  ].join("\n");

  // Add button for detailed view
  const keyboard = new InlineKeyboard().text(
    strings.show_about(`سبک ${style.name}`),
    `detail:${QuizType.LeftRight}:${resultType}`
  );

  await ctx.reply(resultText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });

  return resultType;
}

export async function replyDetail(ctx: Context, key: ResultType) {
  const style = styles[key];
  if (!style) throw "Cognitive style not found!";

  const message = [
    `${style.emoji} *${style.name}*`,
    "",
    style.description,
    "",
    "*ویژگی‌ها:*",
    ...style.traits.map((trait) => `  ${trait}`),
  ].join("\n");

  ctx.reply(message, { parse_mode: "Markdown" });
}

