# Complementary Matrix for Matching Algorithm

This document defines the compatibility matrices for both Archetype and MBTI matching used in the MatchFound bot.

## Archetype Compatibility Matrix

### Matching Rules

1. **Opposite-Gender Matching**: Each goddess has a list of recommended gods (and vice versa) based on their mythological and psychological compatibility.
2. **Same-Gender Matching**: Match users with the same primary archetype result (e.g., Hera ↔ Hera, Zeus ↔ Zeus).

### Goddess → God Compatibility

#### Hera (هرا)
- **Zeus** (زئوس) - Power couple, royal partnership, shared ambition
- **Apollo** (آپولو) - Intelligent, organized, committed partner

#### Demeter (دیمیتر)
- **Zeus** (زئوس) - Security and stability provider
- **Hades** (هادس) - Deep, mysterious, helps her focus on self

#### Persephone (پرسفونه)
- **Hades** (هادس) - Deep understanding of her mysterious nature
- **Hermes** (هرمس) - Helps her break free from dependency

#### Artemis (آرتمیس)
- **Ares** (آرس) - Warrior spirit, adventure companion
- **Hermes** (هرمس) - Brings lightness and joy to her serious nature

#### Athena (آتنا)
- **Zeus** (زئوس) - Powerful strategic partnership
- **Hephaestus** (هفایستوس) - Creative, introspective balance

#### Aphrodite (آفرودیت)
- **Ares** (آرس) - Passionate, fiery relationship
- **Hermes** (هرمس) - Playful, free-spirited connection

#### Hestia (هستیا)
- **Hephaestus** (هفایستوس) - Deep, calm, creative partnership
- **Poseidon** (پوزئیدون) - Emotional depth and balance

### God → Goddess Compatibility

#### Zeus (زئوس)
- **Hera** (هرا) - Loyal, powerful queen partner
- **Aphrodite** (آفرودیت) - Beautiful, passionate, brings excitement

#### Hades (هادس)
- **Persephone** (پرسفونه) - Mysterious, adaptable, understands his depth
- **Hestia** (هستیا) - Calm, spiritual, brings inner peace

#### Apollo (آپولو)
- **Athena** (آتنا) - Intelligent, strategic, logical match
- **Aphrodite** (آفرودیت) - Beautiful, emotional, brings balance

#### Ares (آرس)
- **Aphrodite** (آفرودیت) - Beautiful, passionate, fiery connection
- **Artemis** (آرتمیس) - Independent, warrior, competitive match

#### Dionysus (دیونیسوس)
- **Persephone** (پرسفونه) - Deep, mysterious, spiritual journey
- **Aphrodite** (آفرودیت) - Attractive, sensual, pleasure-loving

#### Hermes (هرمس)
- **Athena** (آتنا) - Intelligent, independent, challenges his mind
- **Aphrodite** (آفرودیت) - Attractive, life-loving, playful energy

#### Hephaestus (هفایستوس)
- **Hestia** (هستیا) - Calm, patient, creates safe space
- **Aphrodite** (آفرودیت) - Attractive, inspiring, brings energy

#### Poseidon (پوزئیدون)
- **Persephone** (پرسفونه) - Mysterious, flexible, deep emotional connection
- **Demeter** (دیمیتر) - Nurturing, supportive, provides emotional security

### Implementation Structure

```typescript
// Archetype compatibility mapping
const archetypeCompatibility: Record<string, string[]> = {
  // Goddesses
  hera: ["zeus", "apollo"],
  demeter: ["zeus", "hades"],
  persephone: ["hades", "hermes"],
  artemis: ["ares", "hermes"],
  athena: ["zeus", "hephaestus"],
  aphrodite: ["ares", "hermes"],
  hestia: ["hephaestus", "poseidon"],
  
  // Gods
  zeus: ["hera", "aphrodite"],
  hades: ["persephone", "hestia"],
  apollo: ["athena", "aphrodite"],
  ares: ["aphrodite", "artemis"],
  dionysus: ["persephone", "aphrodite"],
  hermes: ["athena", "aphrodite"],
  hephaestus: ["hestia", "aphrodite"],
  poseidon: ["persephone", "demeter"],
};
```

### Matching Logic

1. **For opposite-gender matching:**
   - Get user's primary archetype
   - Get list of compatible archetypes from `archetypeCompatibility[userArchetype]`
   - Match with users whose primary archetype is in the compatibility list
   - Example: User is Hera → Match with Zeus or Apollo

2. **For same-gender matching:**
   - Match users with identical primary archetype
   - Example: Female Hera ↔ Female Hera, Male Zeus ↔ Male Zeus

---

## MBTI Compatibility Matrix

### Matching Rules

MBTI compatibility is based on cognitive function compatibility and complementary personality types. Each type has compatible types that create balanced, harmonious relationships.

### MBTI Type Compatibility

#### ENFP (The Campaigner)
- **INTJ** (The Architect) - Ideal match, complementary functions
- **INFJ** (The Advocate) - Deep understanding
- **ISFJ** (The Protector) - Supportive balance

#### ENTP (The Debater)
- **INFJ** (The Advocate) - Perfect intellectual match
- **INTJ** (The Architect) - Strategic partnership
- **ISFJ** (The Protector) - Grounding influence

#### ENFJ (The Protagonist)
- **INFP** (The Mediator) - Deep emotional connection
- **INTP** (The Thinker) - Intellectual balance
- **ISFP** (The Adventurer) - Creative harmony

#### ENTJ (The Commander)
- **INFP** (The Mediator) - Complementary strengths
- **ISFP** (The Adventurer) - Balanced partnership
- **INTP** (The Thinker) - Strategic match

#### INFP (The Mediator)
- **ENTJ** (The Commander) - Complementary leadership
- **ENFJ** (The Protagonist) - Emotional understanding
- **ESTJ** (The Executive) - Practical balance

#### INTP (The Thinker)
- **ENTJ** (The Commander) - Strategic partnership
- **ENFJ** (The Protagonist) - Intellectual harmony
- **ESFJ** (The Consul) - Social balance

#### INFJ (The Advocate)
- **ENTP** (The Debater) - Perfect intellectual match
- **ENFP** (The Campaigner) - Deep connection
- **ESTP** (The Entrepreneur) - Dynamic balance

#### INTJ (The Architect)
- **ENFP** (The Campaigner) - Ideal match, complementary
- **ENTP** (The Debater) - Strategic partnership
- **ESFP** (The Entertainer) - Social balance

#### ISFP (The Adventurer)
- **ENTJ** (The Commander) - Complementary strengths
- **ENFJ** (The Protagonist) - Creative harmony
- **ESTJ** (The Executive) - Practical balance

#### ISFJ (The Protector)
- **ENFP** (The Campaigner) - Supportive balance
- **ENTP** (The Debater) - Grounding influence
- **ESFP** (The Entertainer) - Social harmony

#### ISTP (The Virtuoso)
- **ESFJ** (The Consul) - Complementary social skills
- **ESTJ** (The Executive) - Practical partnership
- **ENFJ** (The Protagonist) - Balanced connection

#### ISTJ (The Logistician)
- **ESFP** (The Entertainer) - Social balance
- **ESTP** (The Entrepreneur) - Dynamic partnership
- **ENFP** (The Campaigner) - Complementary energy

#### ESFP (The Entertainer)
- **ISTJ** (The Logistician) - Practical balance
- **ISFJ** (The Protector) - Supportive harmony
- **INTJ** (The Architect) - Strategic match

#### ESFJ (The Consul)
- **ISTP** (The Virtuoso) - Complementary skills
- **ISFP** (The Adventurer) - Creative balance
- **INTP** (The Thinker) - Intellectual harmony

#### ESTP (The Entrepreneur)
- **ISFJ** (The Protector) - Grounding influence
- **ISTJ** (The Logistician) - Practical partnership
- **INFJ** (The Advocate) - Dynamic balance

#### ESTJ (The Executive)
- **ISFP** (The Adventurer) - Creative balance
- **INFP** (The Mediator) - Complementary strengths
- **ISTP** (The Virtuoso) - Practical match

### Implementation Structure

```typescript
// MBTI compatibility mapping
const mbtiCompatibility: Record<string, string[]> = {
  ENFP: ["INTJ", "INFJ", "ISFJ"],
  ENTP: ["INFJ", "INTJ", "ISFJ"],
  ENFJ: ["INFP", "INTP", "ISFP"],
  ENTJ: ["INFP", "ISFP", "INTP"],
  INFP: ["ENTJ", "ENFJ", "ESTJ"],
  INTP: ["ENTJ", "ENFJ", "ESFJ"],
  INFJ: ["ENTP", "ENFP", "ESTP"],
  INTJ: ["ENFP", "ENTP", "ESFP"],
  ISFP: ["ENTJ", "ENFJ", "ESTJ"],
  ISFJ: ["ENFP", "ENTP", "ESFP"],
  ISTP: ["ESFJ", "ESTJ", "ENFJ"],
  ISTJ: ["ESFP", "ESTP", "ENFP"],
  ESFP: ["ISTJ", "ISFJ", "INTJ"],
  ESFJ: ["ISTP", "ISFP", "INTP"],
  ESTP: ["ISFJ", "ISTJ", "INFJ"],
  ESTJ: ["ISFP", "INFP", "ISTP"],
};
```

### Matching Logic

1. Get user's MBTI type
2. Get list of compatible types from `mbtiCompatibility[userMBTI]`
3. Match with users whose MBTI type is in the compatibility list
4. Example: User is ENFP → Match with INTJ, INFJ, or ISFJ

---

## Combined Matching Algorithm

When both archetype and MBTI are available:

1. **Priority 1**: Users matching both archetype AND MBTI criteria
2. **Priority 2**: Users matching archetype criteria only
3. **Priority 3**: Users matching MBTI criteria only

Within each priority level, sort by:
- Profile completion score (higher first)
- Age compatibility (closer age first)
- Recent activity (more recent first)

---

## Notes

- All matching is subject to gender filters (looking_for_gender must match)
- Age difference must be ≤ 8 years
- Exclude already liked, ignored, or blocked users
- Same-gender archetype matching uses identical archetype (not compatibility list)

