-- CreateTable
CREATE TABLE "bans" (
    "id" BIGSERIAL NOT NULL,
    "banned_user_id" BIGINT NOT NULL,
    "banner_id" BIGINT NOT NULL,
    "banned_until" TIMESTAMP(3),
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bans_banned_user_id_idx" ON "bans"("banned_user_id");

-- CreateIndex
CREATE INDEX "bans_banner_id_idx" ON "bans"("banner_id");

-- CreateIndex
CREATE INDEX "bans_banned_until_idx" ON "bans"("banned_until");

-- AddForeignKey
ALTER TABLE "bans" ADD CONSTRAINT "bans_banned_user_id_fkey" FOREIGN KEY ("banned_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bans" ADD CONSTRAINT "bans_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

