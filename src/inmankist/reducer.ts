import { Bot, Context } from "grammy";
import * as archetype from "./archetype";
import { Deity } from "./archetype/types";
import * as leftright from "./leftright";
import { ResultType } from "./leftright/types";
import * as mbti from "./mbti";
import { MBTIType } from "./mbti/types";
import { quizModes } from "./config";
import { IQuest, IUserData, QuizType } from "./types";

// Optional customization for each quiz

export async function setCustomCommands(bot: Bot) {
  archetype.setCustomCommands(bot);
  mbti.setCustomCommands(bot);
  leftright.setCustomCommands(bot);
}

// Indirect - select

export function selectOrder(user: IUserData) {
  switch (user.quiz) {
    case QuizType.Archetype:
      return archetype.getSample(user.gender, quizModes[user.mode].size);
    case QuizType.MBTI:
      return mbti.getSample(user.gender, quizModes[user.mode].size);
    case QuizType.LeftRight:
      return leftright.getSample(user.gender, quizModes[user.mode].size);
  }
}

export function selectQuizQuestion<T>(
  user: IUserData,
  index: number
): IQuest<T> {
  switch (user.quiz) {
    case QuizType.Archetype:
      return archetype.getQuestion(user, index) as IQuest<T>;
    case QuizType.MBTI:
      return mbti.getQuestion(user, index) as IQuest<T>;
    case QuizType.LeftRight:
      return leftright.getQuestion(user, index) as IQuest<T>;
  }
}

// Direct - reply

export async function replyAbout(ctx: Context, type: QuizType) {
  switch (type) {
    case QuizType.Archetype:
      ctx.react("⚡");
      return archetype.replyAbout(ctx);
    case QuizType.MBTI:
      ctx.react("🤔");
      return mbti.replyAbout(ctx);
    case QuizType.LeftRight:
      ctx.react("🤩");
      return leftright.replyAbout(ctx);
  }
}

export async function replyResult(ctx: Context, user: IUserData) {
  switch (user.quiz) {
    case QuizType.Archetype:
      return archetype.replyResult(ctx, user);
    case QuizType.MBTI:
      return mbti.replyResult(ctx, user);
    case QuizType.LeftRight:
      return leftright.replyResult(ctx, user);
  }
}

export async function replyDetial(ctx: Context, type: QuizType, item: string) {
  switch (type) {
    case QuizType.Archetype:
      return archetype.replyDetail(ctx, item as Deity);
    case QuizType.MBTI:
      return mbti.replyDetail(ctx, item as MBTIType);
    case QuizType.LeftRight:
      return leftright.replyDetail(ctx, item as ResultType);
  }
}
