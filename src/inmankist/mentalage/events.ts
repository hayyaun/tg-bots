import { Bot, Context } from "grammy";
import { getQuestionByQuestionIndex } from ".";
import { getUserLanguage } from "../../shared/i18n";
import { Language } from "../../shared/types";
import { IUserData } from "../types";
import { MentalAgeResult } from "./types";

export function setCustomCommands(bot: Bot) {
  // No custom commands needed for MentalAge
  return bot;
}

export async function replyAbout(ctx: Context) {
  const userId = ctx.from?.id;
  const language = await getUserLanguage(userId);

  const aboutText = {
    [Language.Persian]: [
      "آزمون سن ذهنی (Mental Age Test) سن ذهنی شما را بر اساس پاسخ‌هایتان به سوالات مختلف ارزیابی می‌کند.",
      "",
      "این آزمون به شما کمک می‌کند تا درک بهتری از سطح بلوغ و تجربه ذهنی خود داشته باشید.",
      "",
      "💡 سن ذهنی شما ممکن است با سن واقعی‌تان متفاوت باشد.",
    ],
    [Language.English]: [
      "The Mental Age Test evaluates your mental age based on your responses to various questions.",
      "",
      "This test helps you gain a better understanding of your level of maturity and mental experience.",
      "",
      "💡 Your mental age may differ from your actual age.",
    ],
    [Language.Russian]: [
      "Тест на умственный возраст оценивает ваш умственный возраст на основе ваших ответов на различные вопросы.",
      "",
      "Этот тест поможет вам лучше понять ваш уровень зрелости и умственного опыта.",
      "",
      "💡 Ваш умственный возраст может отличаться от вашего реального возраста.",
    ],
    [Language.Arabic]: [
      "اختبار العمر العقلي يقيم عمرك العقلي بناءً على ردودك على أسئلة متنوعة.",
      "",
      "يساعدك هذا الاختبار على فهم أفضل لمستوى نضجك وتجربتك العقلية.",
      "",
      "💡 قد يختلف عمرك العقلي عن عمرك الفعلي.",
    ],
  };

  await ctx.reply(aboutText[language].join("\n"));
}

// Calculate mental age from user answers
// Answer values: 0-3 (A=0, B=1, C=2, D=3)
// Higher values indicate more mature/older mental age
export function calculateResult(user: IUserData): MentalAgeResult {
  let totalScore = 0;
  let answerCount = 0;

  // Sum all answer values
  Object.entries(user.answers).forEach((answer) => {
    const questionIndex = parseInt(answer[0]);
    const question = getQuestionByQuestionIndex(user, questionIndex);
    if (!question) return;
    const value = answer[1]; // 0-3 scale
    totalScore += value;
    answerCount++;
  });

  // Calculate average score (0-3 range)
  const averageScore = answerCount > 0 ? totalScore / answerCount : 1.5;

  // Map average score to mental age (5-100 range)
  // 0 -> 5 (very young)
  // 1 -> 30 (young)
  // 2 -> 50 (middle)
  // 3 -> 80 (mature)
  // Linear interpolation
  const minAge = 5;
  const maxAge = 100;
  const age = Math.round(minAge + (averageScore / 3) * (maxAge - minAge));

  return { age };
}

export async function replyResult(ctx: Context, language: Language, result: MentalAgeResult) {
  const { age } = result;

  const labels = {
    [Language.Persian]: {
      title: "نتایج آزمون سن ذهنی",
      yourAge: "سن ذهنی شما",
      years: "سال",
    },
    [Language.English]: {
      title: "Mental Age Test Results",
      yourAge: "Your Mental Age",
      years: "years",
    },
    [Language.Russian]: {
      title: "Результаты теста на умственный возраст",
      yourAge: "Ваш умственный возраст",
      years: "лет",
    },
    [Language.Arabic]: {
      title: "نتائج اختبار العمر العقلي",
      yourAge: "عمرك العقلي",
      years: "سنة",
    },
  };

  // Create result message
  const resultText = [
    `🧠 ${labels[language].title}`,
    ``,
    `🎯 ${labels[language].yourAge}: *${age}* ${labels[language].years}`,
  ].join("\n");

  await ctx.reply(resultText, {
    parse_mode: "Markdown",
  });
}

export async function replyDetail(ctx: Context, key: string) {
  // Mental age doesn't have detail view like other quizzes
  const userId = ctx.from?.id;
  const language = await getUserLanguage(userId);
  
  const labels = {
    [Language.Persian]: "آزمون سن ذهنی جزئیات اضافی ندارد.",
    [Language.English]: "Mental Age test does not have additional details.",
    [Language.Russian]: "Тест на умственный возраст не имеет дополнительных деталей.",
    [Language.Arabic]: "اختبار العمر العقلي لا يحتوي على تفاصيل إضافية.",
  };

  await ctx.reply(labels[language]);
}
