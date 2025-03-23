import fs from "fs";
import { Context, InputFile } from "grammy";
import _ from "lodash";
import path from "path";
import { intToEmoji } from "../utils/emoji";
import { toPercentage } from "../utils/string";
import * as archetype from "./archetype";
import { deities } from "./archetype/strings";
import { Deity } from "./archetype/types";
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

export async function selectQuizResult(ctx: Context, user: IUserData) {
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

      const messages = sortedResults.map(
        ([deity, value], i) =>
          `${i + 1}. ${deities[deity]} \n${intToEmoji(toPercentage(value, user.sampleSize * 3))}`
      );
      const message = messages.join("\n");
      const mainDeity = sortedResults[0][0];
      const filename = `${mainDeity}.webp`;
      const imageBuffer = fs.readFileSync(
        path.join(process.cwd(), `assets/${filename}`)
      );
      await ctx.replyWithPhoto(new InputFile(imageBuffer, filename), {
        caption: message,
      });
      break;
    }

    default:
      break; // TODO error
  }
}
