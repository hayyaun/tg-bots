import { Context, InlineKeyboard, InputFile } from "grammy";
import _ from "lodash";
import { toPercentage } from "../utils/string";
import * as archetype from "./archetype";
import deities from "./archetype/deities";
import { Deity } from "./archetype/types";
import { addTextToImage } from "./canvas";
import { quizModes } from "./config";
import strings from "./strings";
import { IQuest, IUserData, QuizType } from "./types";

export function selectQuizQuestion<T>(
  user: IUserData,
  index: number
): IQuest<T> | null {
  switch (user.quiz) {
    case QuizType.Archetype:
      return archetype.getQuestion(user.order, index, user.gender) as IQuest<T>;
    default:
      return null;
  }
}

export async function replyResult(ctx: Context, user: IUserData) {
  switch (user.quiz) {
    case QuizType.Archetype: {
      const result = new Map<Deity, number>();
      Object.entries(user.answers).forEach((answer) => {
        const index = parseInt(answer[0]);
        const question = selectQuizQuestion<Deity>(user, index);
        if (!question) throw "Something went wrong!"; // TODO error
        const value = answer[1];
        const previous = result.get(question.belong);
        result.set(question.belong, (previous ?? 0) + value);
      });
      const sortedResults = _.reverse(
        _.sortBy([...result], ([, value]) => value)
      );

      // process image
      const textRight = sortedResults
        .slice(0, 3)
        .map(([deity], i) => `${i + 1}. ${deities[deity].name} \n`);
      const textLeft = sortedResults
        .slice(0, 3)
        .map(
          ([, value]) =>
            `${toPercentage(value, quizModes[user.mode].size * 3)}% \n`
        );

      const mainDeity = sortedResults[0][0];
      const src = await addTextToImage(
        deities[mainDeity].image,
        textRight,
        textLeft
      );

      // add buttons
      const keyboard = new InlineKeyboard();
      sortedResults.slice(0, 3).forEach((r) => {
        const text = strings.show_about(`کهن الگو ${deities[r[0]].name}`);
        const to = `about:${QuizType.Archetype}:${r[0]}`;
        keyboard.text(text, to).row();
      });
      await ctx.replyWithPhoto(new InputFile(src, mainDeity + ".jpg"), {
        // caption: message,
        reply_markup: keyboard,
      });
      break;
    }
  }
}

export async function replyDetials(ctx: Context, type: QuizType, item: string) {
  switch (type) {
    case QuizType.Archetype: {
      const deity = deities[item];
      if (!deity) return; // TODO error
      ctx.reply(deity.about, { parse_mode: "MarkdownV2" });
    }
  }
}

export async function selectOrder(user: IUserData) {
  switch (user.quiz) {
    case QuizType.Archetype: {
      return archetype.getSample(user.gender, quizModes[user.mode].size);
    }
  }
}
