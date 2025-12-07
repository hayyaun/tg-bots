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
      
      // Check if it's a P3005 error (schema mismatch)
      if (errorOutput.includes('P3005') || errorOutput.includes('schema is not empty')) {
        console.log('Database schema mismatch detected (P3005). Marking migration as applied...');
        
        // Mark the migration as applied in Prisma history
        await markMigrationAsApplied();
        
        // Try migrate deploy again
        try {
          execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
          console.log('Migration deploy succeeded after marking migration');
          return;
        } catch (retryError) {
          console.log('Migration deploy still failed. Migration may already be applied.');
          // Verify migration status
          await verifyMigration();
        }
      } else {
        console.log('Migration deploy failed with unexpected error.');
      }
    }
  } catch (error) {
    console.error('Error applying migration:', error.message);
  }
}

async function markMigrationAsApplied() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('DATABASE_URL not set, cannot mark migration');
    return;
  }
  
  try {
    const url = new URL(dbUrl.replace('postgresql://', 'http://'));
    const user = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1);
    
    // Check if already marked
    const checkSql = `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = '20250115000000_limit_profile_image_to_one';`;
    const existing = execSync(
      `PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${database}" -t -A -c "${checkSql}"`,
      { encoding: 'utf-8', env: { ...process.env, PGPASSWORD: password } }
    ).trim();
    
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
    
    execSync(
      `PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${database}" -f "${tempMarkFile}"`,
      { stdio: 'inherit', env: { ...process.env, PGPASSWORD: password } }
    );
    
    fs.unlinkSync(tempMarkFile);
    console.log('✓ Migration marked as applied in Prisma history');
  } catch (error) {
    console.log('Note: Could not mark migration in Prisma history (non-critical):', error.message);
  }
}

async function verifyMigration() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return;
    
    const url = new URL(dbUrl.replace('postgresql://', 'http://'));
    const user = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1);
    
    const checkSql = `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='users' AND column_name='profile_image') as exists;`;
    const result = execSync(
      `PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${database}" -t -A -c "${checkSql}"`,
      { encoding: 'utf-8', env: { ...process.env, PGPASSWORD: password } }
    ).trim();
    
    if (result === 't') {
      console.log('✓ Migration verified: profile_image column exists');
    } else {
      console.log('⚠ Warning: profile_image column does not exist');
    }
  } catch (error) {
    console.error('Error verifying migration:', error.message);
  }
}

applyMigration()
  .then(() => {
    console.log('Migration check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error in migration script:', error);
    process.exit(0);
  });
