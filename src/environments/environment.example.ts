export const environment = {
  production: false,
  supabaseUrl: 'https://votre-projet.supabase.co',
  supabaseAnonKey: 'votre-cle-anon-publique',
  // 'simulation' tant que Stripe n'est pas branché, puis 'stripe' (clés Stripe dans backend/.env, voir backend/README.md).
  paymentMode: 'simulation',
  // URL du back Python (dossier backend/) qui sert l'assistant IA.
  aiApiUrl: 'http://localhost:8000',
};
