// Big Five Aspects Scale Types
// Based on research by Jordan Peterson, Colin DeYoung, Lena Quilty, and Jeremy Gray

// The 5 major personality traits
export enum BigFiveTrait {
  Openness = "Openness",
  Conscientiousness = "Conscientiousness",
  Extraversion = "Extraversion",
  Agreeableness = "Agreeableness",
  Neuroticism = "Neuroticism",
}

// The 10 aspects (2 per trait)
export enum BigFiveAspect {
  // Openness aspects
  Intellect = "Intellect", // Openness to Experience
  Aesthetics = "Aesthetics", // Openness to Aesthetics
  
  // Conscientiousness aspects
  Industriousness = "Industriousness",
  Orderliness = "Orderliness",
  
  // Extraversion aspects
  Enthusiasm = "Enthusiasm",
  Assertiveness = "Assertiveness",
  
  // Agreeableness aspects
  Compassion = "Compassion",
  Politeness = "Politeness",
  
  // Neuroticism aspects
  Withdrawal = "Withdrawal",
  Volatility = "Volatility",
}

// Mapping aspects to traits
export const aspectToTrait: { [key in BigFiveAspect]: BigFiveTrait } = {
  [BigFiveAspect.Intellect]: BigFiveTrait.Openness,
  [BigFiveAspect.Aesthetics]: BigFiveTrait.Openness,
  [BigFiveAspect.Industriousness]: BigFiveTrait.Conscientiousness,
  [BigFiveAspect.Orderliness]: BigFiveTrait.Conscientiousness,
  [BigFiveAspect.Enthusiasm]: BigFiveTrait.Extraversion,
  [BigFiveAspect.Assertiveness]: BigFiveTrait.Extraversion,
  [BigFiveAspect.Compassion]: BigFiveTrait.Agreeableness,
  [BigFiveAspect.Politeness]: BigFiveTrait.Agreeableness,
  [BigFiveAspect.Withdrawal]: BigFiveTrait.Neuroticism,
  [BigFiveAspect.Volatility]: BigFiveTrait.Neuroticism,
};

export interface BigFiveResult {
  traits: { [key in BigFiveTrait]?: number };
  aspects: { [key in BigFiveAspect]?: number };
}

