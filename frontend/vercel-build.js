import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  execSync('npm run build', { 
    stdio: 'inherit',
    cwd: dirname(__filename)
  });
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 