// Écrit src/environments/environment.ts à partir des variables d'environnement de l'hébergeur (Vercel...).
// Le fichier n'est pas versionné : en local, on garde le sien ; sans SUPABASE_URL, le script ne touche à rien.
import { writeFileSync } from 'node:fs';

const env = process.env;

if (!env.SUPABASE_URL) {
  console.log('SUPABASE_URL absente : environment.ts local conservé.');
  process.exit(0);
}

if (!env.SUPABASE_ANON_KEY) {
  console.error('SUPABASE_ANON_KEY manquante.');
  process.exit(1);
}

const config = {
  production: true,
  supabaseUrl: env.SUPABASE_URL,
  supabaseAnonKey: env.SUPABASE_ANON_KEY,
  paymentMode: env.PAYMENT_MODE === 'stripe' ? 'stripe' : 'simulation',
  aiApiUrl: env.AI_API_URL || 'http://localhost:8000',
};

writeFileSync('src/environments/environment.ts', `export const environment = ${JSON.stringify(config, null, 2)};\n`);
console.log('environment.ts écrit pour', config.supabaseUrl);
