import fs from 'fs';
import path from 'path';

const logoPath = path.join(__dirname, '../src/assets/images/logo.png');
const base64Logo = fs.readFileSync(logoPath, { encoding: 'base64' });
console.log(`data:image/png;base64,${base64Logo}`); 