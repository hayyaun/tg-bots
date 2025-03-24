import { Context } from "grammy";
import * as archetype from "./archetype";
import deities from "./archetype/deities";
import { quizModes } from "./config";
import { IQuest, IUserData, QuizType } from "./types";

export async function replyAbout(ctx: Context, type: QuizType) {
  switch (type) {
    case QuizType.Archetype:
      return archetype.replyAbout(ctx);
  }
}

export function selectQuizQuestion<T>(
  user: IUserData,
  index: number
): IQuest<T> | null {
  switch (user.quiz) {
    case QuizType.Archetype:
      return archetype.getQuestion(user, index) as IQuest<T>;
    default:
      return null;
  }
}

export async function replyResult(ctx: Context, user: IUserData) {
  switch (user.quiz) {
    case QuizType.Archetype:
      return archetype.replyResult(ctx, user);
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
