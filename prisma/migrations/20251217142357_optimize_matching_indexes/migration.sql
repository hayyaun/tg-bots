-- Optimize matching queries with composite partial indexes
-- These indexes cover the full query pattern for efficient matching at scale

-- Composite index for gender-specific matching (covers WHERE + ORDER BY)
-- Partial index only includes eligible users to reduce index size
CREATE INDEX IF NOT EXISTS "users_matching_gender_idx" 
ON "users"("gender", "birth_date", "completion_score" DESC) 
WHERE "username" IS NOT NULL 
  AND "gender" IS NOT NULL 
  AND "birth_date" IS NOT NULL 
  AND array_length("interests", 1) > 0
  AND "completion_score" >= 30;

-- Composite index for "both" gender matching (same structure)
-- This helps when looking_for_gender = 'both'
CREATE INDEX IF NOT EXISTS "users_matching_both_idx" 
ON "users"("birth_date", "completion_score" DESC) 
WHERE "username" IS NOT NULL 
  AND "gender" IN ('male', 'female')
  AND "birth_date" IS NOT NULL 
  AND array_length("interests", 1) > 0
  AND "completion_score" >= 30;

-- Optimize likes table queries with composite index
CREATE INDEX IF NOT EXISTS "likes_user_liked_idx" 
ON "likes"("user_id", "liked_user_id");

-- Optimize ignored table queries with composite indexes
CREATE INDEX IF NOT EXISTS "ignored_user_ignored_idx" 
ON "ignored"("user_id", "ignored_user_id");
CREATE INDEX IF NOT EXISTS "ignored_ignored_user_idx" 
ON "ignored"("ignored_user_id", "user_id");

