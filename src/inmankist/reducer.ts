import { Bot, Context } from "grammy";
import * as archetype from "./archetype";
import { Deity } from "./archetype/types";
import * as enneagram from "./enneagram";
import { EnneagramType } from "./enneagram/types";
import * as leftright from "./leftright";
import { ResultType } from "./leftright/types";
import * as mbti from "./mbti";
import { MBTIType } from "./mbti/types";
import * as politicalcompass from "./politicalcompass";
import { Quadrant } from "./politicalcompass/types";
import { quizModes } from "./config";
import { IQuest, IUserData, Language, QuizType } from "./types";

// Optional customization for each quiz

export async function setCustomCommands(bot: Bot) {
  archetype.setCustomCommands(bot);
  mbti.setCustomCommands(bot);
  leftright.setCustomCommands(bot);
  politicalcompass.setCustomCommands(bot);
  enneagram.setCustomCommands(bot);
}

// Indirect - select

export function selectOrder(user: IUserData) {
  const size = quizModes[user.mode].size;
  const language = user.language || Language.Persian;
  switch (user.quiz) {
    case QuizType.Archetype:
      return archetype.getSample(user.gender, size, language);
    case QuizType.MBTI:
      return mbti.getSample(user.gender, size, language);
    case QuizType.LeftRight:
      return leftright.getSample(user.gender, size, language);
    case QuizType.PoliticalCompass:
      return politicalcompass.getSample(user.gender, size, language);
    case QuizType.Enneagram:
      return enneagram.getSample(user.gender, size, language);
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
    case QuizType.PoliticalCompass:
      return politicalcompass.getQuestion(user, index) as IQuest<T>;
    case QuizType.Enneagram:
      return enneagram.getQuestion(user, index) as IQuest<T>;
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
    case QuizType.PoliticalCompass:
      ctx.react("🤯");
      return politicalcompass.replyAbout(ctx);
    case QuizType.Enneagram:
      ctx.react("🎉");
      return enneagram.replyAbout(ctx);
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
    case QuizType.PoliticalCompass:
      return politicalcompass.replyResult(ctx, user);
    case QuizType.Enneagram:
      return enneagram.replyResult(ctx, user);
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
    case QuizType.PoliticalCompass:
      return politicalcompass.replyDetail(ctx, item as Quadrant);
    case QuizType.Enneagram:
      return enneagram.replyDetail(ctx, item as EnneagramType);
  }
}
