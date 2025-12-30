import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

try {
  // Try using sips (macOS built-in)
  execSync('sips -s format jpeg -z 800 1280 image.png --out chrome-store.jpg', { stdio: 'inherit' });
  console.log('Successfully created chrome-store.jpg using sips');
  
  // Verify dimensions
  const dimensions = execSync('sips -g pixelWidth -g pixelHeight chrome-store.jpg', { encoding: 'utf-8' });
  console.log('Dimensions:', dimensions);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

