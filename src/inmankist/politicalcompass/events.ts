import { Bot, Context, InlineKeyboard, InputFile } from "grammy";
import { getQuestionByQuestionIndex } from ".";
import { getStringsForUser } from "../i18n";
import { Language } from "../../shared/types";
import { QuizType } from "../../shared/types";
import { IUserData } from "../types";
import { generateCompassChart } from "./canvas";
import quadrants from "./quadrants";
import { PoliticalAxis, Quadrant, PoliticalCompassResult } from "./types";

export function setCustomCommands(bot: Bot) {
  // No custom commands needed for political compass
  return bot;
}

export async function replyAbout(ctx: Context) {
  const keyboard = new InlineKeyboard();

  Object.values(Quadrant).forEach((quad) => {
    keyboard.text(
      quadrants[quad].emoji + " " + quadrants[quad].name,
      `detail:${QuizType.PoliticalCompass}:${quad}`
    );
    keyboard.row();
  });

  await ctx.reply(
    [
      "قطب‌نمای سیاسی دیدگاه‌های سیاسی شما را در دو محور اندازه‌گیری می‌کند:",
      "",
      "📊 محور اقتصادی: چپ (دخالت دولت) ↔ راست (بازار آزاد)",
      "🏛️ محور اجتماعی: اقتدارگرا (نظم) ↔ آزادی‌خواه (آزادی)",
      "",
      "⚠️ این آزمون صرفاً تمایلات فکری را می‌سنجد و قضاوت اخلاقی نیست.",
    ].join("\n"),
    { reply_markup: keyboard }
  );
}

function determineQuadrant(
  economicScore: number,
  socialScore: number
): Quadrant {
  // Economic: negative = left, positive = right
  // Social: negative = authoritarian, positive = libertarian

  // Center threshold (within 20% of center)
  if (Math.abs(economicScore) < 20 && Math.abs(socialScore) < 20) {
    return Quadrant.Center;
  }

  if (economicScore < 0) {
    // Left
    if (socialScore < 0) {
      return Quadrant.AuthLeft; // Authoritarian Left
    } else {
      return Quadrant.LibLeft; // Libertarian Left
    }
  } else {
    // Right
    if (socialScore < 0) {
      return Quadrant.AuthRight; // Authoritarian Right
    } else {
      return Quadrant.LibRight; // Libertarian Right
    }
  }
}

export function calculateResult(user: IUserData): PoliticalCompassResult {
  // Calculate scores for each axis
  let economicLeftScore = 0;
  let economicRightScore = 0;
  let authoritarianScore = 0;
  let libertarianScore = 0;

  Object.entries(user.answers).forEach((answer) => {
    const questionIndex = parseInt(answer[0]);
    const question = getQuestionByQuestionIndex(user, questionIndex);
    if (!question) throw "Something went wrong!";
    const value = answer[1]; // 0-3 scale

    switch (question.belong) {
      case PoliticalAxis.EconomicLeft:
        economicLeftScore += value;
        break;
      case PoliticalAxis.EconomicRight:
        economicRightScore += value;
        break;
      case PoliticalAxis.Authoritarian:
        authoritarianScore += value;
        break;
      case PoliticalAxis.Libertarian:
        libertarianScore += value;
        break;
    }
  });

  // Calculate net scores (-100 to +100 scale)
  const economicTotal = economicLeftScore + economicRightScore || 1;
  const socialTotal = authoritarianScore + libertarianScore || 1;

  // Economic: negative = left, positive = right
  const economicScore =
    ((economicRightScore - economicLeftScore) / economicTotal) * 100;

  // Social: negative = authoritarian, positive = libertarian
  const socialScore =
    ((libertarianScore - authoritarianScore) / socialTotal) * 100;

  // Determine quadrant
  const quadrant = determineQuadrant(economicScore, socialScore);
  return { quadrant, economicScore, socialScore };
}

export async function replyResult(ctx: Context, language: Language, result: PoliticalCompassResult) {
  const { quadrant, economicScore, socialScore } = result;
  const quadrantInfo = quadrants[quadrant];

  // Create descriptive position
  const economicPosition =
    Math.abs(economicScore) < 10
      ? "میانه"
      : economicScore < -30
        ? "چپ قوی"
        : economicScore < 0
          ? "چپ میانه"
          : economicScore > 30
            ? "راست قوی"
            : "راست میانه";

  const socialPosition =
    Math.abs(socialScore) < 10
      ? "میانه"
      : socialScore < -30
        ? "اقتدارگرای قوی"
        : socialScore < 0
          ? "اقتدارگرای میانه"
          : socialScore > 30
            ? "آزادی‌خواه قوی"
            : "آزادی‌خواه میانه";

  // Create message
  const resultText = [
    `${quadrantInfo.emoji} *${quadrantInfo.name}*`,
    "",
    quadrantInfo.description,
    "",
    "🎯 *ویژگی‌ها:*",
    ...quadrantInfo.traits.map((trait) => `  ${trait}`),
    "",
    `💡 ${quadrantInfo.examples}`,
    "",
    "📊 *موقعیت شما:*",
    `  📈 اقتصادی: ${economicPosition} (${economicScore > 0 ? "+" : ""}${Math.round(economicScore)})`,
    `  🏛️ اجتماعی: ${socialPosition} (${socialScore > 0 ? "+" : ""}${Math.round(socialScore)})`,
  ].join("\n");

  // Generate chart
  const chartBuffer = generateCompassChart(economicScore, socialScore, language);

  // Add button for detailed view
  const userId = ctx.from?.id;
  const strings = await getStringsForUser(userId);
  const keyboard = new InlineKeyboard().text(
    `${strings.about} قطب ${quadrantInfo.name}`,
    `detail:${QuizType.PoliticalCompass}:${quadrant}`
  );

  // Send chart with caption
  await ctx.replyWithPhoto(new InputFile(chartBuffer, "compass.png"), {
    caption: resultText,
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

export async function replyDetail(ctx: Context, key: Quadrant) {
  const quadrantInfo = quadrants[key];
  if (!quadrantInfo) throw "Quadrant not found!";

  const message = [
    `${quadrantInfo.emoji} *${quadrantInfo.name}*`,
    "",
    quadrantInfo.description,
    "",
    "*ویژگی‌ها:*",
    ...quadrantInfo.traits.map((trait) => `  ${trait}`),
    "",
    `💡 ${quadrantInfo.examples}`,
  ].join("\n");

  ctx.reply(message, { parse_mode: "Markdown" });
}

