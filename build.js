const { execSync } = require('child_process');
const fs = require('fs');

if (fs.existsSync('frontend') && fs.existsSync('frontend/package.json')) {
  console.log('Detected project root. Navigating to frontend and building...');
  execSync('npm --prefix frontend install && npm --prefix frontend run build', { stdio: 'inherit' });
} else {
  console.log('Already inside frontend. Running vite build directly...');
  execSync('npm run build', { stdio: 'inherit' });
}
