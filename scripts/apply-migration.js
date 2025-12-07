const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function applyMigration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Attempting standard migration deploy...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('Standard migration deploy succeeded');
      return;
    } catch (e) {
      const errorOutput = e.stderr?.toString() || e.stdout?.toString() || e.message || '';
      console.log('Standard migration deploy failed:', errorOutput.substring(0, 200));
      
      // Check if it's a P3005 error (schema mismatch) - this is expected for the first migration
      // or if the database was modified outside of migrations
      if (errorOutput.includes('P3005') || errorOutput.includes('schema is not empty')) {
        console.log('Database schema mismatch detected (P3005). Checking for specific migrations...');
        
        // Handle the specific profile_images migration if needed
        await handleProfileImageMigration(prisma);
        
        // Try migrate deploy again after handling the specific migration
        try {
          execSync('npx prisma migrate deploy', { stdio: 'inherit' });
          console.log('Migration deploy succeeded after handling specific migration');
          return;
        } catch (retryError) {
          console.log('Migration deploy still failed after handling specific migration');
          console.log('This might be expected if there are other pending migrations.');
          console.log('The app will start, but you may need to resolve migration issues manually.');
        }
      } else {
        // For other errors, log but don't block startup
        console.log('Migration deploy failed with unexpected error. App will start anyway.');
        console.log('You may need to resolve migration issues manually.');
      }
    }
  } catch (error) {
    console.error('Error applying migration:', error.message);
    // Don't fail the startup - let the app try to start anyway
  } finally {
    await prisma.$disconnect();
  }
}

async function handleProfileImageMigration(prisma) {
  try {
    // Check if profile_image column already exists
    const profileImageCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name='users' AND column_name='profile_image'
      ) as exists
    `;

    if (profileImageCheck && profileImageCheck[0]?.exists) {
      console.log('profile_image migration already applied - column exists');
      return;
    }

    // Check if profile_images column exists (needs migration)
    const profileImagesCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name='users' AND column_name='profile_images'
      ) as exists
    `;

    if (profileImagesCheck && profileImagesCheck[0]?.exists) {
      console.log('Applying profile_images → profile_image migration (preserving data)...');
      
      // Apply the migration SQL manually to preserve data
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_image" VARCHAR(255);
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE "users"
        SET "profile_image" = "profile_images"[array_length("profile_images", 1)]
        WHERE array_length("profile_images", 1) > 0 AND "profile_image" IS NULL;
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users" DROP COLUMN IF EXISTS "profile_images";
      `);

      console.log('profile_images migration applied successfully - data preserved');
    }
  } catch (error) {
    console.error('Error handling profile_image migration:', error.message);
    // Don't throw - let other migrations proceed
  }
}

applyMigration()
  .then(() => {
    console.log('Migration check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error in migration script:', error);
    // Exit with code 0 to allow app to start anyway
    // The migration might already be applied or not needed
    process.exit(0);
  });
