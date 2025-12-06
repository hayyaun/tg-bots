import { Bot, Context, InlineKeyboard } from "grammy";
import _ from "lodash";
import { getQuestion } from ".";
import { getUserLanguage, getStringsForUser } from "../i18n";
import { IUserData, Language, QuizType } from "../types";
import { descriptions } from "./descriptions";
import { Vision } from "./types";

export function setCustomCommands(bot: Bot) {
  // No custom commands needed for vision test
  return bot;
}

export async function replyAbout(ctx: Context) {
  const keyboard = new InlineKeyboard();
  const userId = ctx.from?.id;
  const language = await getUserLanguage(userId);

  // Arrange visions in a grid
  const visions = [
    Vision.Anemo,
    Vision.Geo,
    Vision.Electro,
    Vision.Dendro,
    Vision.Hydro,
    Vision.Pyro,
    Vision.Cryo,
  ];

  visions.forEach((vision, index) => {
    const desc = descriptions[vision];
    keyboard.text(
      `${desc.emoji} ${desc.nickname[language]}`,
      `detail:${QuizType.Vision}:${vision}`
    );
    // Put 3 visions per row
    if ((index + 1) % 3 === 0) keyboard.row();
  });

  const aboutText = {
    [Language.Persian]: [
      "آزمون ویژن (Vision) بر اساس داستان Genshin Impact طراحی شده است.",
      "",
      "در این بازی، اصول آسمانی به برخی شخصیت‌ها ویژن می‌دهند - قدرت عنصری که با ویژگی‌ها و اهداف آن‌ها هماهنگ است.",
      "",
      "🌪️ هفت عنصر وجود دارد: آنمو (باد)، جئو (زمین)، الکترو (برق)، دندرو (طبیعت)، هیدرو (آب)، پیرو (آتش)، و کریو (یخ).",
      "",
      "💡 این آزمون به شما کمک می‌کند بفهمید کدام ویژن با شخصیت شما سازگار است.",
    ],
    [Language.English]: [
      "The Vision test is based on the lore of Genshin Impact.",
      "",
      "In the game, the Heavenly Principles grant certain characters Visions - elemental powers that align with their traits and goals.",
      "",
      "🌪️ There are seven elements: Anemo (Wind), Geo (Earth), Electro (Lightning), Dendro (Nature), Hydro (Water), Pyro (Fire), and Cryo (Ice).",
      "",
      "💡 This test helps you discover which Vision aligns with your personality.",
    ],
    [Language.Russian]: [
      "Тест Видений основан на лоре Genshin Impact.",
      "",
      "В игре Небесные Принципы дарят некоторым персонажам Видения - стихийные силы, соответствующие их чертам и целям.",
      "",
      "🌪️ Существует семь элементов: Анемо (Ветер), Гео (Земля), Электро (Молния), Дендро (Природа), Гидро (Вода), Пиро (Огонь) и Крио (Лед).",
      "",
      "💡 Этот тест поможет вам узнать, какое Видение соответствует вашей личности.",
    ],
    [Language.Arabic]: [
      "اختبار الرؤية مبني على قصة Genshin Impact.",
      "",
      "في اللعبة، المبادئ السماوية تمنح بعض الشخصيات رؤى - قوى عنصرية تتماشى مع صفاتها وأهدافها.",
      "",
      "🌪️ هناك سبعة عناصر: أنيمو (الرياح)، جيو (الأرض)، إلكترو (البرق)، دندرو (الطبيعة)، هيدرو (الماء)، بايرو (النار)، وكريو (الجليد).",
      "",
      "💡 يساعدك هذا الاختبار على اكتشاف الرؤية التي تتماشى مع شخصيتك.",
    ],
  };

  await ctx.reply(aboutText[language].join("\n"), { reply_markup: keyboard });
}

export async function replyResult(ctx: Context, user: IUserData) {
  // Calculate scores for each vision
  const visionScores = new Map<Vision, number>();

  Object.entries(user.answers).forEach((answer) => {
    const index = parseInt(answer[0]);
    const question = getQuestion(user, index);
    if (!question) throw "Something went wrong!";
    const value = answer[1];
    const previous = visionScores.get(question.belong);
    visionScores.set(question.belong, (previous ?? 0) + value);
  });

  // Sort by scores
  const sortedResults = _.reverse(
    _.sortBy([...visionScores], ([, value]) => value)
  );

  // Get top 3 visions
  const topVisions = sortedResults.slice(0, 3);
  const mainVision = topVisions[0][0];
  const mainDesc = descriptions[mainVision];
  const language = user.language || Language.Persian;

  // Calculate percentages
  const totalScore = sortedResults.reduce((sum, [, score]) => sum + score, 0);
  const topPercentages = topVisions.map(([vision, score]) => ({
    vision,
    percentage: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
  }));

  const labels = {
    [Language.Persian]: {
      traits: "ویژگی‌های اصلی",
      distribution: "توزیع ویژن‌های شما",
      vision: "ویجن",
    },
    [Language.English]: {
      traits: "Main Traits",
      distribution: "Your Vision Distribution",
      vision: "Vision",
    },
    [Language.Russian]: {
      traits: "Основные черты",
      distribution: "Распределение ваших Видений",
      vision: "Видение",
    },
    [Language.Arabic]: {
      traits: "السمات الرئيسية",
      distribution: "توزيع رؤاك",
      vision: "الرؤية",
    },
  };

  // Create message
  const resultText = [
    `${mainDesc.emoji} *${mainDesc.name[language]}*`,
    `_${mainDesc.nickname[language]}_`,
    "",
    mainDesc.description[language],
    "",
    `🎯 ${mainDesc.characteristic[language]}`,
    "",
    `*${labels[language].traits}:*`,
    ...mainDesc.traits[language].map((trait: string) => `  ${trait}`),
    "",
    `📊 *${labels[language].distribution}:*`,
    ...topPercentages.map(({ vision, percentage }) => {
      const desc = descriptions[vision];
      return `  ${desc.emoji} ${desc.nickname[language]}: ${percentage}%`;
    }),
  ].join("\n");

  // Add buttons for top 3 visions
  const userId = ctx.from?.id;
  const strings = await getStringsForUser(userId);
  const keyboard = new InlineKeyboard();
  topVisions.forEach(([vision]) => {
    const desc = descriptions[vision];
    keyboard.text(
      strings.show_about(desc.nickname[language]),
      `detail:${QuizType.Vision}:${vision}`
    );
    keyboard.row();
  });

  await ctx.reply(resultText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });

  return sortedResults;
}

export async function replyDetail(ctx: Context, key: Vision) {
  const userId = ctx.from?.id;
  const language = await getUserLanguage(userId);
  const desc = descriptions[key];
  if (!desc) throw "Vision not found!";

  const labels = {
    [Language.Persian]: "ویژگی‌های اصلی",
    [Language.English]: "Main Traits",
    [Language.Russian]: "Основные черты",
    [Language.Arabic]: "السمات الرئيسية",
  };

  const message = [
    `${desc.emoji} *${desc.name[language]}*`,
    `_${desc.nickname[language]}_`,
    "",
    desc.description[language],
    "",
    `🎯 ${desc.characteristic[language]}`,
    "",
    `*${labels[language]}:*`,
    ...desc.traits[language].map((trait: string) => `  ${trait}`),
  ].join("\n");

  ctx.reply(message, { parse_mode: "Markdown" });
}

