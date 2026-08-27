const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'src', 'config', 'env.ts');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const content = `export const ENV = {
  SUPABASE_URL: '${url}',
  SUPABASE_ANON_KEY: '${key}',
};
`;

fs.writeFileSync(envPath, content);
console.log('env.ts generated from environment variables');
