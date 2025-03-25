import { Bot, Context, InlineKeyboard, InputFile } from "grammy";
import _ from "lodash";
import { getQuestion } from ".";
import { toPercentage } from "../../utils/string";
import { quizModes } from "../config";
import strings from "../strings";
import { IUserData, QuizType } from "../types";
import { addTextBoxToImage } from "./canvas";
import deities from "./deities";
import { Deity } from "./types";

export function setCustomCommands(bot: Bot) {
  // TODO anything
  return bot;
}

export async function replyAbout(ctx: Context) {
  const keyboard = new InlineKeyboard();
  Object.keys(deities).forEach((k, i) => {
    keyboard.text(deities[k].name, `detail:${QuizType.Archetype}:${k}`);
    if (i % 2) keyboard.row();
  });
  await ctx.reply(
    "آزمون کهن الگوها به شما نشان می دهد که به کدام یک از خدایان باستانی یونانی شباهت دارید.",
    { reply_markup: keyboard }
  );
}

export async function replyResult(ctx: Context, user: IUserData) {
  const result = new Map<Deity, number>();
  Object.entries(user.answers).forEach((answer) => {
    const index = parseInt(answer[0]);
    const question = getQuestion(user, index);
    if (!question) throw "Something went wrong!"; // TODO error
    const value = answer[1];
    const previous = result.get(question.belong);
    result.set(question.belong, (previous ?? 0) + value);
  });
  const sortedResults = _.reverse(_.sortBy([...result], ([, value]) => value));

  // process image
  const textRight = sortedResults
    .slice(0, 3)
    .map(([deity], i) => `${i + 1}. ${deities[deity].name} \n`);
  const textLeft = sortedResults
    .slice(0, 3)
    .map(
      ([, value]) => `${toPercentage(value, quizModes[user.mode].size * 3)}% \n`
    );

  const mainDeity = sortedResults[0][0];
  const src = await addTextBoxToImage(
    deities[mainDeity].image,
    textRight,
    textLeft
  );

  // add buttons
  const keyboard = new InlineKeyboard();
  sortedResults.slice(0, 3).forEach((r) => {
    const text = strings.show_about(`کهن الگو ${deities[r[0]].name}`);
    const to = `detail:${QuizType.Archetype}:${r[0]}`;
    keyboard.text(text, to).row();
  });
  await ctx.replyWithPhoto(new InputFile(src, mainDeity + ".jpg"), {
    // caption: message,
    reply_markup: keyboard,
  });
}

export async function replyDetail(ctx: Context, key: Deity) {
  const deity = deities[key];
  if (!deity) throw "Deity not found!";
  const url = `https://hayyaun.ir/tg/deity/${deity.name}`;
  const rhash = "ab61e4b98f351c";
  const instantViewLink = `https://t.me/iv?url=${encodeURIComponent(url)}&rhash=${rhash}`;
  const message = `${deity.about.slice(0, 80)}... [ادامه](${instantViewLink})`;
  ctx.reply(message, { parse_mode: "MarkdownV2" });
}
