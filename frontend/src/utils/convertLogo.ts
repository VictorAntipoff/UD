import fs from 'fs';
import path from 'path';

const logoPath = path.join(__dirname, '../assets/images/logo.png');
const base64Logo = fs.readFileSync(logoPath, { encoding: 'base64' });

export const logoBase64 = `data:image/png;base64,${base64Logo}`; 