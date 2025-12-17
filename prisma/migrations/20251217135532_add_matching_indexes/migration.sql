-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_gender_idx" ON "users"("gender");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_looking_for_gender_idx" ON "users"("looking_for_gender");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_completion_score_idx" ON "users"("completion_score");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_birth_date_idx" ON "users"("birth_date");

-- CreateIndex (GIN index for array field - requires raw SQL)
CREATE INDEX IF NOT EXISTS "users_interests_idx" ON "users" USING GIN("interests");

