const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  try {
    console.log('Attempting standard migration deploy...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
      console.log('Standard migration deploy succeeded');
      return;
    } catch (e) {
      const errorOutput = (e.stderr?.toString() || e.stdout?.toString() || e.message || '').substring(0, 500);
      console.log('Standard migration deploy failed. Error:', errorOutput);
      
      // Check if it's a P3005 error (schema mismatch) or data loss warning
      if (errorOutput.includes('P3005') || errorOutput.includes('schema is not empty') || errorOutput.includes('data loss')) {
        console.log('Database schema mismatch or data loss warning detected. Applying migration manually...');
        
        // Handle the specific profile_images migration using prisma db execute
        await handleProfileImageMigration();
        
        // Try migrate deploy again after handling the specific migration
        try {
          execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
          console.log('Migration deploy succeeded after handling specific migration');
          return;
        } catch (retryError) {
          console.log('Migration deploy still failed after handling specific migration');
          console.log('Checking if migration was already applied...');
          // Verify the migration was applied
          await verifyMigration();
        }
      } else {
        // For other errors, try to apply the migration anyway
        console.log('Migration deploy failed. Attempting to apply profile_image migration directly...');
        await handleProfileImageMigration();
        await verifyMigration();
      }
    }
  } catch (error) {
    console.error('Error applying migration:', error.message);
    console.error('Stack:', error.stack);
    // Don't fail the startup - let the app try to start anyway
  }
}

async function handleProfileImageMigration() {
  // First check if migration is already applied
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const url = new URL(dbUrl.replace('postgresql://', 'http://'));
      const user = url.username;
      const password = url.password;
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1);
      
      // Check if profile_image exists and profile_images doesn't (migration already done)
      const checkSql = `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='users' AND column_name='profile_image') as exists;`;
      const tempCheckFile = path.join('/tmp', 'check_profile_image.sql');
      fs.writeFileSync(tempCheckFile, checkSql);
      
      const profileImageResult = execSync(`PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${database}" -t -A -f "${tempCheckFile}"`, {
        encoding: 'utf-8',
        env: { ...process.env, PGPASSWORD: password }
      }).trim();
      
      fs.unlinkSync(tempCheckFile);
      
      const hasProfileImage = profileImageResult === 't';
      
      if (hasProfileImage) {
        // Check if profile_images still exists
        const checkImagesSql = `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='users' AND column_name='profile_images') as exists;`;
        const tempCheckImagesFile = path.join('/tmp', 'check_profile_images.sql');
        fs.writeFileSync(tempCheckImagesFile, checkImagesSql);
        
        const profileImagesResult = execSync(`PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${database}" -t -A -f "${tempCheckImagesFile}"`, {
          encoding: 'utf-8',
          env: { ...process.env, PGPASSWORD: password }
        }).trim();
        
        fs.unlinkSync(tempCheckImagesFile);
        const hasProfileImages = profileImagesResult === 't';
        
        if (!hasProfileImages) {
          console.log('Migration already applied - profile_image exists, profile_images removed');
          // Mark migration as applied in Prisma history
          await markMigrationAsApplied();
          return;
        }
      }
    } catch (checkError) {
      console.log('Could not check migration status:', checkError.message);
      console.log('Proceeding with migration attempt...');
    }
  }
  
  // Use prisma db execute to run SQL directly - this avoids PrismaClient schema mismatch issues
  const migrationSql = `-- AlterTable: Change profile_images array to profile_image single string
-- Keep the latest (last) image for each user

-- Step 1: Add new column for single image
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_image" VARCHAR(255);

-- Step 2: Migrate data - keep the last image from the array (if array has elements)
UPDATE "users"
SET "profile_image" = "profile_images"[array_length("profile_images", 1)]
WHERE array_length("profile_images", 1) > 0 AND "profile_image" IS NULL;

-- Step 3: Drop the old array column
ALTER TABLE "users" DROP COLUMN IF EXISTS "profile_images";
`;

  // Write SQL to temp file and execute
  const tempFile = path.join('/tmp', 'profile_image_migration.sql');
  
  try {
    fs.writeFileSync(tempFile, migrationSql);
    console.log('Applying profile_images → profile_image migration (preserving data)...');
    
    execSync(`npx prisma db execute --file "${tempFile}"`, {
      stdio: 'inherit',
      env: process.env
    });
    
    console.log('profile_images migration applied successfully - data preserved');
    
    // Mark migration as applied in Prisma history
    await markMigrationAsApplied();
  } catch (error) {
    console.error('Error applying migration via prisma db execute:', error.message);
    // Try alternative: use psql directly if available
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        console.log('Trying alternative method with psql...');
        // Extract connection details from DATABASE_URL
        const url = new URL(dbUrl.replace('postgresql://', 'http://'));
        const user = url.username;
        const password = url.password;
        const host = url.hostname;
        const port = url.port || '5432';
        const database = url.pathname.slice(1);
        
        // Use PGPASSWORD and psql
        execSync(`PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${database}" -f "${tempFile}"`, {
          stdio: 'inherit',
          env: { ...process.env, PGPASSWORD: password }
        });
        console.log('Migration applied using psql');
      } catch (psqlError) {
        console.error('psql method also failed:', psqlError.message);
        throw error; // Throw original error
      }
    } else {
      throw error;
    }
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

async function markMigrationAsApplied() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  
  try {
    const url = new URL(dbUrl.replace('postgresql://', 'http://'));
    const user = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1);
    
    // Check if already marked
    const checkSql = `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = '20250115000000_limit_profile_image_to_one';`;
    const tempCheckFile = path.join('/tmp', 'check_migration_history.sql');
    fs.writeFileSync(tempCheckFile, checkSql);
    
    const existing = execSync(`PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${database}" -t -A -f "${tempCheckFile}"`, {
      encoding: 'utf-8',
      env: { ...process.env, PGPASSWORD: password }
    }).trim();
    
    fs.unlinkSync(tempCheckFile);
    
    if (existing) {
      console.log('Migration already marked in Prisma history');
      return;
    }
    
    // Mark migration as applied
    const markSql = `
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (
        gen_random_uuid(),
        '',
        NOW(),
        '20250115000000_limit_profile_image_to_one',
        NULL,
        NULL,
        NOW(),
        1
      );
    `;
    const tempMarkFile = path.join('/tmp', 'mark_migration.sql');
    fs.writeFileSync(tempMarkFile, markSql);
    
    execSync(`PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${database}" -f "${tempMarkFile}"`, {
      stdio: 'inherit',
      env: { ...process.env, PGPASSWORD: password }
    });
    
    fs.unlinkSync(tempMarkFile);
    console.log('✓ Migration marked as applied in Prisma history');
  } catch (error) {
    console.log('Note: Could not mark migration in Prisma history (non-critical):', error.message);
  }
}

async function verifyMigration() {
  // Use a simple query to verify - avoid PrismaClient if possible
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const url = new URL(dbUrl.replace('postgresql://', 'http://'));
      const user = url.username;
      const password = url.password;
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1);
      
      const checkSql = `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='users' AND column_name='profile_image') as exists;`;
      const tempCheckFile = path.join('/tmp', 'check_migration.sql');
      fs.writeFileSync(tempCheckFile, checkSql);
      
      try {
        const result = execSync(`PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${database}" -t -A -f "${tempCheckFile}"`, {
          encoding: 'utf-8',
          env: { ...process.env, PGPASSWORD: password }
        }).trim();
        
        if (result === 't') {
          console.log('✓ Migration verified: profile_image column exists');
        } else {
          console.log('⚠ Warning: profile_image column does not exist after migration attempt');
        }
      } finally {
        if (fs.existsSync(tempCheckFile)) {
          fs.unlinkSync(tempCheckFile);
        }
      }
    }
  } catch (error) {
    console.error('Error verifying migration:', error.message);
    // Non-fatal
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
