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
import { Quadrant, PoliticalCompassResult } from "./politicalcompass/types";
import * as bigfive from "./bigfive";
import { BigFiveAspect, BigFiveTrait } from "./bigfive/types";
import { quizModes } from "./config";
import { Language } from "../shared/types";
import { IQuest, IUserData, QuizType } from "./types";
import { storeQuizResult } from "./quizResults";

// Optional customization for each quiz

export async function setCustomCommands(bot: Bot) {
  archetype.setCustomCommands(bot);
  mbti.setCustomCommands(bot);
  leftright.setCustomCommands(bot);
  politicalcompass.setCustomCommands(bot);
  enneagram.setCustomCommands(bot);
  bigfive.setCustomCommands(bot);
}

// Indirect - select

export function selectOrder(user: IUserData) {
  const size = quizModes[user.mode].size;
  const language = user.language || Language.Persian;
  
  switch (user.quiz) {
    case QuizType.Archetype:
      if (!user.gender) {
        throw new Error("Gender is required for Archetype quiz");
      }
      return archetype.getSample(user.gender, size, language);
    case QuizType.MBTI:
      return mbti.getSample(size, language);
    case QuizType.LeftRight:
      return leftright.getSample(size, language);
    case QuizType.PoliticalCompass:
      return politicalcompass.getSample(size, language);
    case QuizType.Enneagram:
      return enneagram.getSample(size, language);
    case QuizType.BigFive:
      return bigfive.getSample(size, language);
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
    case QuizType.BigFive:
      return bigfive.getQuestion(user, index) as IQuest<T>;
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
    case QuizType.BigFive:
      ctx.react("🔥");
      return bigfive.replyAbout(ctx);
  }
}

export async function replyResult(ctx: Context, user: IUserData) {
  const userId = ctx.from?.id;
  if (!userId) throw new Error("User ID not found");

  let result: unknown;

  switch (user.quiz) {
    case QuizType.Archetype: {
      result = archetype.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await archetype.replyResult(ctx, user, result as Array<[Deity, number]>);
      return result;
    }
    case QuizType.MBTI: {
      result = mbti.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await mbti.replyResult(ctx, user, result as MBTIType);
      return result;
    }
    case QuizType.LeftRight: {
      result = leftright.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await leftright.replyResult(ctx, user, result as ResultType);
      return result;
    }
    case QuizType.PoliticalCompass: {
      result = politicalcompass.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await politicalcompass.replyResult(ctx, user, result as PoliticalCompassResult);
      return result;
    }
    case QuizType.Enneagram: {
      result = enneagram.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await enneagram.replyResult(ctx, user, result as Array<[EnneagramType, number]>);
      return result;
    }
    case QuizType.BigFive: {
      result = bigfive.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await bigfive.replyResult(ctx, user, result as {
        traits: { [key in BigFiveTrait]?: number };
        aspects: { [key in BigFiveAspect]?: number };
      });
      return result;
    }
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
    case QuizType.BigFive:
      return bigfive.replyDetail(ctx, item as BigFiveAspect);
  }
}
