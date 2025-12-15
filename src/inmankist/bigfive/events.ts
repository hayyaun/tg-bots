import { Bot, Context, InlineKeyboard } from "grammy";
import { getQuestion } from ".";
import { getStringsForUser } from "../i18n";
import { getUserLanguage } from "../../shared/i18n";
import { Language } from "../../shared/types";
import { IUserData, QuizType } from "../types";
import { aspectToTrait, BigFiveAspect, BigFiveTrait } from "./types";

export function setCustomCommands(bot: Bot) {
  // No custom commands needed for BigFive
  return bot;
}

export async function replyAbout(ctx: Context) {
  const userId = ctx.from?.id;
  const language = await getUserLanguage(userId);

  const aboutText = {
    [Language.Persian]: [
      "آزمون پنج عامل بزرگ شخصیت (Big Five Aspects Scale) شخصیت شما را در پنج بعد اصلی و ده جنبه فرعی ارزیابی می‌کند.",
      "",
      "این آزمون بر اساس تحقیقات علمی جردن پترسون، کالین دی یانگ، لنا کوئیلتی و جرمی گری طراحی شده است.",
      "",
      "💡 این آزمون به شما کمک می‌کند تا درک عمیق‌تری از شخصیت خود داشته باشید.",
    ],
    [Language.English]: [
      "The Big Five Aspects Scale evaluates your personality across five major traits and ten aspects.",
      "",
      "This test is based on scientific research by Jordan Peterson, Colin DeYoung, Lena Quilty, and Jeremy Gray.",
      "",
      "💡 This test helps you gain a deeper understanding of your personality.",
    ],
    [Language.Russian]: [
      "Шкала Большой Пятерки оценивает вашу личность по пяти основным чертам и десяти аспектам.",
      "",
      "Этот тест основан на научных исследованиях Джордана Петерсона, Колина ДеЯнга, Лены Куилти и Джереми Грея.",
      "",
      "💡 Этот тест поможет вам глубже понять свою личность.",
    ],
    [Language.Arabic]: [
      "مقياس العوامل الخمسة الكبرى يقيم شخصيتك عبر خمس سمات رئيسية وعشرة جوانب.",
      "",
      "هذا الاختبار مبني على أبحاث علمية لجوردان بيترسون وكولين دي يونغ ولينا كويلتي وجيريمي غراي.",
      "",
      "💡 يساعدك هذا الاختبار على اكتساب فهم أعمق لشخصيتك.",
    ],
  };

  await ctx.reply(aboutText[language].join("\n"));
}

// Calculate scores for each aspect and trait
function calculateScores(user: IUserData): {
  aspectScores: Map<BigFiveAspect, number>;
  traitScores: Map<BigFiveTrait, number>;
} {
  const aspectScores = new Map<BigFiveAspect, number>();
  const traitScores = new Map<BigFiveTrait, number>();

  // Initialize all aspects and traits to 0
  Object.values(BigFiveAspect).forEach((aspect) => {
    aspectScores.set(aspect, 0);
  });
  Object.values(BigFiveTrait).forEach((trait) => {
    traitScores.set(trait, 0);
  });

  // Calculate aspect scores
  Object.entries(user.answers).forEach((answer) => {
    const index = parseInt(answer[0]);
    const question = getQuestion(user, index);
    if (!question) return;
    const value = answer[1]; // 0-3 scale

    const previous = aspectScores.get(question.belong);
    aspectScores.set(question.belong, (previous ?? 0) + value);
  });

  // Calculate trait scores by summing their aspects
  Object.entries(aspectToTrait).forEach(([aspect, trait]) => {
    const aspectScore = aspectScores.get(aspect as BigFiveAspect) || 0;
    const previousTraitScore = traitScores.get(trait) || 0;
    traitScores.set(trait, previousTraitScore + aspectScore);
  });

  return { aspectScores, traitScores };
}

// Get trait description
function getTraitDescription(trait: BigFiveTrait, language: Language): string {
  const descriptions: { [key in BigFiveTrait]: { [key in Language]: string } } = {
    [BigFiveTrait.Openness]: {
      [Language.Persian]: "گشودگی به تجربه",
      [Language.English]: "Openness to Experience",
      [Language.Russian]: "Открытость опыту",
      [Language.Arabic]: "الانفتاح على التجربة",
    },
    [BigFiveTrait.Conscientiousness]: {
      [Language.Persian]: "وجدان‌گرایی",
      [Language.English]: "Conscientiousness",
      [Language.Russian]: "Сознательность",
      [Language.Arabic]: "الضمير",
    },
    [BigFiveTrait.Extraversion]: {
      [Language.Persian]: "برون‌گرایی",
      [Language.English]: "Extraversion",
      [Language.Russian]: "Экстраверсия",
      [Language.Arabic]: "الانبساط",
    },
    [BigFiveTrait.Agreeableness]: {
      [Language.Persian]: "سازگاری",
      [Language.English]: "Agreeableness",
      [Language.Russian]: "Доброжелательность",
      [Language.Arabic]: "الموافقة",
    },
    [BigFiveTrait.Neuroticism]: {
      [Language.Persian]: "روان‌رنجوری",
      [Language.English]: "Neuroticism",
      [Language.Russian]: "Нейротизм",
      [Language.Arabic]: "العصابية",
    },
  };
  return descriptions[trait][language];
}

// Get aspect description
function getAspectDescription(aspect: BigFiveAspect, language: Language): string {
  const descriptions: { [key in BigFiveAspect]: { [key in Language]: string } } = {
    [BigFiveAspect.Intellect]: {
      [Language.Persian]: "هوشمندی",
      [Language.English]: "Intellect",
      [Language.Russian]: "Интеллект",
      [Language.Arabic]: "الذكاء",
    },
    [BigFiveAspect.Aesthetics]: {
      [Language.Persian]: "زیبایی‌شناسی",
      [Language.English]: "Aesthetics",
      [Language.Russian]: "Эстетика",
      [Language.Arabic]: "الجماليات",
    },
    [BigFiveAspect.Industriousness]: {
      [Language.Persian]: "سخت‌کوشی",
      [Language.English]: "Industriousness",
      [Language.Russian]: "Трудолюбие",
      [Language.Arabic]: "الاجتهاد",
    },
    [BigFiveAspect.Orderliness]: {
      [Language.Persian]: "نظم‌گرایی",
      [Language.English]: "Orderliness",
      [Language.Russian]: "Порядок",
      [Language.Arabic]: "النظام",
    },
    [BigFiveAspect.Enthusiasm]: {
      [Language.Persian]: "اشتیاق",
      [Language.English]: "Enthusiasm",
      [Language.Russian]: "Энтузиазм",
      [Language.Arabic]: "الحماس",
    },
    [BigFiveAspect.Assertiveness]: {
      [Language.Persian]: "قاطعیت",
      [Language.English]: "Assertiveness",
      [Language.Russian]: "Уверенность",
      [Language.Arabic]: "الحزم",
    },
    [BigFiveAspect.Compassion]: {
      [Language.Persian]: "دلسوزی",
      [Language.English]: "Compassion",
      [Language.Russian]: "Сострадание",
      [Language.Arabic]: "الرحمة",
    },
    [BigFiveAspect.Politeness]: {
      [Language.Persian]: "ادب",
      [Language.English]: "Politeness",
      [Language.Russian]: "Вежливость",
      [Language.Arabic]: "الأدب",
    },
    [BigFiveAspect.Withdrawal]: {
      [Language.Persian]: "کناره‌گیری",
      [Language.English]: "Withdrawal",
      [Language.Russian]: "Отстраненность",
      [Language.Arabic]: "الانسحاب",
    },
    [BigFiveAspect.Volatility]: {
      [Language.Persian]: "نوسان‌پذیری",
      [Language.English]: "Volatility",
      [Language.Russian]: "Нестабильность",
      [Language.Arabic]: "التقلب",
    },
  };
  return descriptions[aspect][language];
}

// Calculate percentage score (0-100)
function calculatePercentage(score: number, maxPossible: number): number {
  if (maxPossible === 0) return 0;
  return Math.round((score / maxPossible) * 100);
}

export function calculateResult(user: IUserData): {
  traits: { [key in BigFiveTrait]?: number };
  aspects: { [key in BigFiveAspect]?: number };
} {
  const { aspectScores, traitScores } = calculateScores(user);
  const totalQuestions = user.order.length;
  const maxScorePerQuestion = 3; // Value.D = 3

  // Calculate trait percentages
  const traitResults = Array.from(traitScores.entries()).map(([trait, score]) => {
    const questionsPerAspect = totalQuestions / 10;
    const maxTraitScore = questionsPerAspect * 2 * maxScorePerQuestion;
    return {
      trait,
      percentage: calculatePercentage(score, maxTraitScore),
    };
  });

  // Calculate aspect percentages
  const aspectResults = Array.from(aspectScores.entries()).map(([aspect, score]) => {
    const questionsPerAspect = totalQuestions / 10;
    const maxAspectScore = questionsPerAspect * maxScorePerQuestion;
    return {
      aspect,
      percentage: calculatePercentage(score, maxAspectScore),
    };
  });

  return {
    traits: Object.fromEntries(
      traitResults.map((r) => [r.trait, r.percentage])
    ) as { [key in BigFiveTrait]?: number },
    aspects: Object.fromEntries(
      aspectResults.map((r) => [r.aspect, r.percentage])
    ) as { [key in BigFiveAspect]?: number },
  };
}

export async function replyResult(ctx: Context, language: Language, result: {
  traits: { [key in BigFiveTrait]?: number };
  aspects: { [key in BigFiveAspect]?: number };
}) {
  // Use the percentages from the result
  const traitResults = Object.entries(result.traits)
    .map(([trait, percentage]) => ({
      trait: trait as BigFiveTrait,
      percentage: percentage || 0,
      description: getTraitDescription(trait as BigFiveTrait, language),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const aspectResults = Object.entries(result.aspects)
    .map(([aspect, percentage]) => ({
      aspect: aspect as BigFiveAspect,
      percentage: percentage || 0,
      description: getAspectDescription(aspect as BigFiveAspect, language),
      trait: aspectToTrait[aspect as BigFiveAspect],
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const labels = {
    [Language.Persian]: {
      title: "نتایج آزمون پنج عامل بزرگ شخصیت",
      traits: "نمرات پنج عامل اصلی",
      aspects: "نمرات ده جنبه",
      percentage: "درصد",
    },
    [Language.English]: {
      title: "Big Five Aspects Scale Results",
      traits: "Five Major Traits Scores",
      aspects: "Ten Aspects Scores",
      percentage: "Percentage",
    },
    [Language.Russian]: {
      title: "Результаты Шкалы Большой Пятерки",
      traits: "Оценки пяти основных черт",
      aspects: "Оценки десяти аспектов",
      percentage: "Процент",
    },
    [Language.Arabic]: {
      title: "نتائج مقياس العوامل الخمسة الكبرى",
      traits: "درجات السمات الخمس الرئيسية",
      aspects: "درجات الجوانب العشرة",
      percentage: "النسبة المئوية",
    },
  };

  // Create result message
  const resultText = [
    `🎯 ${labels[language].title}`,
    ``,
    `📊 ${labels[language].traits}:`,
    ...traitResults.map(
      (r) => `• ${r.description}: ${r.percentage}%`
    ),
    ``,
    `📈 ${labels[language].aspects}:`,
    ...aspectResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Show top 5 aspects
      .map((r) => `• ${r.description}: ${r.percentage}%`),
  ].join("\n");

  await ctx.reply(resultText, {
    parse_mode: "Markdown",
  });
}

export async function replyDetail(ctx: Context, key: string) {
  const userId = ctx.from?.id;
  const language = await getUserLanguage(userId);

  // Try to parse as trait or aspect
  let description = "";
  let title = "";

  if (Object.values(BigFiveTrait).includes(key as BigFiveTrait)) {
    title = getTraitDescription(key as BigFiveTrait, language);
    // Could add more detailed descriptions here
    description = title;
  } else if (Object.values(BigFiveAspect).includes(key as BigFiveAspect)) {
    title = getAspectDescription(key as BigFiveAspect, language);
    description = title;
  } else {
    await ctx.reply("Invalid key");
    return;
  }

  const message = [`*${title}*`, ``, description].join("\n");
  ctx.reply(message, { parse_mode: "Markdown" });
}

