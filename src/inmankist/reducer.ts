import { Bot, Context } from "grammy";
import { Language, QuizType } from "../shared/types";
import * as archetype from "./archetype";
import { Deity } from "./archetype/types";
import * as bigfive from "./bigfive";
import { BigFiveAspect, BigFiveResult } from "./bigfive/types";
import * as mentalage from "./mentalage";
import { MentalAgeResult } from "./mentalage/types";
import { quizModes } from "./config";
import * as enneagram from "./enneagram";
import { EnneagramType } from "./enneagram/types";
import * as leftright from "./leftright";
import { LeftRightResult, ResultType } from "./leftright/types";
import * as mbti from "./mbti";
import { MBTIResult, MBTIType } from "./mbti/types";
import * as politicalcompass from "./politicalcompass";
import { PoliticalCompassResult, Quadrant } from "./politicalcompass/types";
import { getQuizResult, storeQuizResult } from "./quizResults";
import { IQuest, IUserData } from "./types";

// Optional customization for each quiz

export async function setCustomCommands(bot: Bot) {
  archetype.setCustomCommands(bot);
  mbti.setCustomCommands(bot);
  leftright.setCustomCommands(bot);
  politicalcompass.setCustomCommands(bot);
  enneagram.setCustomCommands(bot);
  bigfive.setCustomCommands(bot);
  mentalage.setCustomCommands(bot);
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
    case QuizType.MentalAge:
      return mentalage.getSample(size, language);
  }
}

export function selectQuizQuestion<T>(
  user: IUserData,
  questionIndex: number
): IQuest<T> {
  switch (user.quiz) {
    case QuizType.Archetype:
      return archetype.getQuestionByQuestionIndex(user, questionIndex) as IQuest<T>;
    case QuizType.MBTI:
      return mbti.getQuestionByQuestionIndex(user, questionIndex) as IQuest<T>;
    case QuizType.LeftRight:
      return leftright.getQuestionByQuestionIndex(user, questionIndex) as IQuest<T>;
    case QuizType.PoliticalCompass:
      return politicalcompass.getQuestionByQuestionIndex(user, questionIndex) as IQuest<T>;
    case QuizType.Enneagram:
      return enneagram.getQuestionByQuestionIndex(user, questionIndex) as IQuest<T>;
    case QuizType.BigFive:
      return bigfive.getQuestionByQuestionIndex(user, questionIndex) as IQuest<T>;
    case QuizType.MentalAge:
      return mentalage.getQuestionByQuestionIndex(user, questionIndex) as IQuest<T>;
  }
}

// Direct - reply

export async function replyAbout(ctx: Context, type: QuizType) {
  switch (type) {
    case QuizType.Archetype:
      ctx.react("⚡").catch(() => {});
      return archetype.replyAbout(ctx);
    case QuizType.MBTI:
      ctx.react("🤔").catch(() => {});
      return mbti.replyAbout(ctx);
    case QuizType.LeftRight:
      ctx.react("🤩").catch(() => {});
      return leftright.replyAbout(ctx);
    case QuizType.PoliticalCompass:
      ctx.react("🤯").catch(() => {});
      return politicalcompass.replyAbout(ctx);
    case QuizType.Enneagram:
      ctx.react("🎉").catch(() => {});
      return enneagram.replyAbout(ctx);
    case QuizType.BigFive:
      ctx.react("🔥").catch(() => {});
      return bigfive.replyAbout(ctx);
    case QuizType.MentalAge:
      ctx.react("🤓").catch(() => {});
      return mentalage.replyAbout(ctx);
  }
}

export async function replyResult(ctx: Context, user: IUserData) {
  const userId = ctx.from?.id;
  if (!userId) throw new Error("User ID not found");
  const language = user.language || Language.Persian;

  let result: unknown;

  switch (user.quiz) {
    case QuizType.Archetype: {
      result = archetype.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await archetype.replyResult(
        ctx,
        language,
        result as Array<[Deity, number]>
      );
      return result;
    }
    case QuizType.MBTI: {
      result = mbti.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await mbti.replyResult(ctx, language, result as MBTIResult);
      return result;
    }
    case QuizType.LeftRight: {
      result = leftright.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await leftright.replyResult(ctx, language, result as LeftRightResult);
      return result;
    }
    case QuizType.PoliticalCompass: {
      result = politicalcompass.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await politicalcompass.replyResult(
        ctx,
        language,
        result as PoliticalCompassResult
      );
      return result;
    }
    case QuizType.Enneagram: {
      result = enneagram.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await enneagram.replyResult(
        ctx,
        language,
        result as Array<[EnneagramType, number]>
      );
      return result;
    }
    case QuizType.BigFive: {
      result = bigfive.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await bigfive.replyResult(ctx, language, result as BigFiveResult);
      return result;
    }
    case QuizType.MentalAge: {
      result = mentalage.calculateResult(user);
      await storeQuizResult(userId, user.quiz, result);
      await mentalage.replyResult(ctx, language, result as MentalAgeResult);
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
    case QuizType.MentalAge:
      return mentalage.replyDetail(ctx, item);
  }
}

// Display saved quiz result if available
export async function displaySavedResult(
  ctx: Context,
  userId: number,
  quizType: QuizType,
  language: Language
): Promise<boolean> {
  try {
    switch (quizType) {
      case QuizType.Archetype: {
        const savedResult = await getQuizResult<Array<[Deity, number]>>(
          userId,
          quizType
        );
        if (!savedResult) return false;
        await archetype.replyResult(ctx, language, savedResult);
        return true;
      }
      case QuizType.MBTI: {
        const savedResult = await getQuizResult<MBTIResult>(userId, quizType);
        if (!savedResult) return false;
        await mbti.replyResult(ctx, language, savedResult);
        return true;
      }
      case QuizType.LeftRight: {
        const savedResult = await getQuizResult<LeftRightResult>(
          userId,
          quizType
        );
        if (!savedResult) return false;
        await leftright.replyResult(ctx, language, savedResult);
        return true;
      }
      case QuizType.PoliticalCompass: {
        const savedResult = await getQuizResult<PoliticalCompassResult>(
          userId,
          quizType
        );
        if (!savedResult) return false;
        await politicalcompass.replyResult(ctx, language, savedResult);
        return true;
      }
      case QuizType.Enneagram: {
        const savedResult = await getQuizResult<Array<[EnneagramType, number]>>(
          userId,
          quizType
        );
        if (!savedResult) return false;
        await enneagram.replyResult(ctx, language, savedResult);
        return true;
      }
      case QuizType.BigFive: {
        const savedResult = await getQuizResult<BigFiveResult>(
          userId,
          quizType
        );
        if (!savedResult) return false;
        await bigfive.replyResult(ctx, language, savedResult);
        return true;
      }
      case QuizType.MentalAge: {
        const savedResult = await getQuizResult<MentalAgeResult>(
          userId,
          quizType
        );
        if (!savedResult) return false;
        await mentalage.replyResult(ctx, language, savedResult);
        return true;
      }
    }
  } catch {
    return false;
  }
}
