import * as fs from 'fs';
import * as path from 'path';

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

function fixFile(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Add @vite-ignore comment before dynamic imports
  content = content.replace(
    /import\(import\.meta\.url\)/g,
    '/* @vite-ignore */\n    import(import.meta.url)'
  );
  
  fs.writeFileSync(fullPath, content);
  console.log(`Fixed: ${filePath}`);
}

filesToFix.forEach(fixFile); 