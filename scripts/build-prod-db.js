const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prodDbPath = path.join(__dirname, '../prisma/prod-template.db');

// Delete old template if it exists
if (fs.existsSync(prodDbPath)) {
  try {
    fs.unlinkSync(prodDbPath);
    console.log('[Build DB] Removed existing production database template.');
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn('[Build DB] File busy, waiting briefly before removing old template...');
      try {
        // Simple delay retry
        execSync('node -e "setTimeout(() => {}, 1000)"');
        if (fs.existsSync(prodDbPath)) {
          fs.unlinkSync(prodDbPath);
        }
      } catch (retryErr) {
        console.warn('[Build DB] Warning: Could not remove old template file, attempting overwrite:', retryErr.message);
      }
    } else {
      console.error('[Build DB] Failed to remove existing template:', err.message);
    }
  }
}

console.log('[Build DB] Creating fresh production database template...');

// Run prisma migrations on the new db file
try {
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: 'file:./prod-template.db'
    },
    stdio: 'inherit'
  });
  console.log('[Build DB] Production database template created successfully.');
  // Brief delay to ensure Windows file handles on prod-template.db are fully released
  execSync('node -e "setTimeout(() => {}, 1000)"');
} catch (error) {
  console.error('[Build DB] Failed to create production database template:', error.message);
  process.exit(1);
}
