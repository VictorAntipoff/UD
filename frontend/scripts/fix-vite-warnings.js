import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToFix = [
  'src/App.tsx',
  'src/contexts/DevelopmentContext.tsx',
  'src/contexts/AuthContext.tsx',
  'src/components/AuthWrapper.tsx',
  'src/layouts/MainLayout.tsx',
  'src/pages/login/LoginPage.tsx',
  'src/pages/HomePage.tsx',
  'src/pages/settings/UserSettings.tsx',
  'src/pages/settings/AdminSettings.tsx',
  'src/components/Navbar.tsx',
  'src/components/SectionLabel.tsx',
  'src/components/auth/LoginForm.tsx',
  'src/layouts/Sidebar.tsx'
];

function fixFile(filePath) {
  const fullPath = path.join(path.dirname(__dirname), filePath);
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Add @vite-ignore comment before HMR-related dynamic imports
    content = content.replace(
      /(\s+)import\(import\.meta\.url\)\.then/g,
      '$1/* @vite-ignore */\n$1import(import.meta.url).then'
    );
    
    // Also handle any other dynamic imports with import.meta.url
    content = content.replace(
      /(\s+)import\(import\.meta\.url\)/g,
      '$1/* @vite-ignore */ import(import.meta.url)'
    );
    
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

filesToFix.forEach(fixFile);
console.log('\nDone! Please restart your Vite dev server to see the changes take effect.'); 