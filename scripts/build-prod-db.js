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
    console.error('[Build DB] Failed to remove existing template:', err);
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
} catch (error) {
  console.error('[Build DB] Failed to create production database template:', error);
  process.exit(1);
}
