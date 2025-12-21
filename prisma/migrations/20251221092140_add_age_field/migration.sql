-- AlterTable
ALTER TABLE "users" ADD COLUMN "age" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_age_idx" ON "users"("age");

-- CreateIndex (composite index for efficient match finding queries)
CREATE INDEX IF NOT EXISTS "users_gender_completion_score_age_idx" ON "users"("gender", "completion_score", "age");

-- CreateIndex (composite index for efficient match finding queries)
CREATE INDEX IF NOT EXISTS "users_completion_score_age_idx" ON "users"("completion_score", "age");

