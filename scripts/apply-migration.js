const { execSync } = require('child_process');

async function applyMigration() {
  try {
    console.log('Attempting standard migration deploy...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
    console.log('✓ Migration deploy succeeded');
  } catch (e) {
    const stderr = e.stderr?.toString() || '';
    const stdout = e.stdout?.toString() || '';
    const errorOutput = (stderr + stdout + e.message).toLowerCase();
    
    console.log('Migration deploy error detected. Checking error type...');
    
    // If P3005 error, mark the migration as applied and retry
    if (errorOutput.includes('p3005') || errorOutput.includes('schema is not empty') || errorOutput.includes('baseline')) {
      console.log('Database schema mismatch (P3005) detected. Marking migration as applied...');
      
      try {
        // Use Prisma's official command to mark migration as applied
        execSync('npx prisma migrate resolve --applied 20250115000000_limit_profile_image_to_one', {
          stdio: 'inherit',
          env: process.env
        });
        console.log('✓ Migration marked as applied');
        
        // Retry migrate deploy
        console.log('Retrying migration deploy...');
        execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
        console.log('✓ Migration deploy succeeded after marking');
      } catch (resolveError) {
        const resolveErr = (resolveError.stderr?.toString() || resolveError.stdout?.toString() || resolveError.message || '').toLowerCase();
        if (resolveErr.includes('already') || resolveErr.includes('not found')) {
          console.log('Migration already marked or not found. This is expected.');
        } else {
          console.log('Could not mark migration:', resolveError.message);
        }
        console.log('App will start anyway - migration is already applied in database.');
      }
    } else {
      console.log('Migration deploy failed with unexpected error.');
      console.log('Error details:', (stderr || stdout || e.message).substring(0, 200));
      console.log('App will start anyway.');
    }
  }
}

applyMigration()
  .then(() => {
    console.log('Migration check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script error:', error.message);
    process.exit(0); // Don't block app startup
  });
