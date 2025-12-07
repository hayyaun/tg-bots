-- AlterTable: Change profile_images array to profile_image single string
-- Keep the latest (last) image for each user

-- Step 1: Add new column for single image
ALTER TABLE "users" ADD COLUMN "profile_image" VARCHAR(255);

-- Step 2: Migrate data - keep the last image from the array (if array has elements)
-- PostgreSQL arrays are 1-indexed, so the last element is at array_length(array, 1)
UPDATE "users"
SET "profile_image" = "profile_images"[array_length("profile_images", 1)]
WHERE array_length("profile_images", 1) > 0;

-- Step 3: Drop the old array column
ALTER TABLE "users" DROP COLUMN "profile_images";
