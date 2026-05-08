import { motion } from 'motion/react';
import { Check, X, Crown, TrendingUp } from 'lucide-react';
import PricingCard from '../components/PricingCard';

export default function PricingPage() {
  const plans = [
    {
      name: 'FREE',
      price: '0€',
      period: 'gratuit',
      description: 'Pour explorer la plateforme',
      features: [
        { text: 'Création de profil', included: true },
        { text: 'Voir 10 profils par mois', included: true },
        { text: '3 contacts par mois', included: true },
        { text: 'Score de compatibilité AI', included: false },
        { text: 'Suggestions personnalisées', included: false },
        { text: 'Générateur de pitch AI', included: false },
        { text: 'Recherche investisseurs', included: false },
        { text: 'Support prioritaire', included: false },
      ],
      cta: 'Commencer',
      variant: 'free',
    },
    {
      name: 'PRO',
      price: '49€',
      period: '/mois',
      badge: 'Populaire',
      description: 'Pour entrepreneurs sérieux',
      features: [
        { text: 'Tout de FREE, plus:', included: true },
        { text: 'Profils illimités', included: true },
        { text: 'Contacts illimités', included: true },
        { text: 'Score de compatibilité AI', included: true },
        { text: 'Suggestions personnalisées', included: true },
        { text: 'Générateur de pitch AI basique', included: true },
        { text: 'Analytics avancés', included: true },
        { text: 'Recherche investisseurs', included: false },
      ],
      cta: 'Souscrire',
      variant: 'pro',
    },
    {
      name: 'PREMIUM',
      price: 'Sur mesure',
      period: '',
      description: 'Solutions personnalisées',
      features: [
        { text: 'Tout de PRO, plus:', included: true },
        { text: 'Générateur pitch IA complet', included: true },
        { text: 'Recherche investisseurs', included: true },
        { text: 'Coaching humain dédié', included: true },
        { text: 'Matching assisté par expert', included: true },
        { text: 'Vérification NDA', included: true },
        { text: 'Événements exclusifs', included: true },
        { text: 'Support 24/7', included: true },
      ],
      cta: 'Nous contacter',
      variant: 'premium',
    },
  ];

  return (
    <div className="min-h-screen pt-32 pb-20 px-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1
            className="text-6xl mb-6 tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Choisissez votre formule
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Des solutions adaptées à chaque étape de votre parcours entrepreneurial
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-3 gap-8 mb-20">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <PricingCard {...plan} />
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-card rounded-2xl border border-border p-12"
        >
          <h2
            className="text-4xl mb-10 text-center"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Comparaison détaillée
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-4 px-6">Fonctionnalité</th>
                  <th className="text-center py-4 px-6 text-muted-foreground">FREE</th>
                  <th className="text-center py-4 px-6 text-accent">PRO</th>
                  <th className="text-center py-4 px-6 text-primary">PREMIUM</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Profils visibles/mois', '10', 'Illimité', 'Illimité'],
                  ['Nombre de contacts', '3/mois', 'Illimité', 'Illimité'],
                  ['Score AI', <X key="x1" size={20} className="text-muted" />, <Check key="c1" size={20} className="text-accent" />, <Check key="c2" size={20} className="text-accent" />],
                  ['Générateur pitch', <X key="x2" size={20} className="text-muted" />, <Check key="c3" size={20} className="text-accent" />, <Check key="c4" size={20} className="text-accent" />],
                  ['Pitch IA', <X key="x3" size={20} className="text-muted" />, '✓ basique', '✓ complet'],
                  ['Recherche investisseurs', <X key="x4" size={20} className="text-muted" />, <X key="x5" size={20} className="text-muted" />, <Check key="c5" size={20} className="text-accent" />],
                  ['Coaching humain', <X key="x6" size={20} className="text-muted" />, <X key="x7" size={20} className="text-muted" />, <Check key="c6" size={20} className="text-accent" />],
                  ['Support', 'Email', 'Email + Chat', '24/7 Dédié'],
                  ['Expert matching', <X key="x8" size={20} className="text-muted" />, <X key="x9" size={20} className="text-muted" />, <Check key="c7" size={20} className="text-accent" />],
                ].map((row, index) => (
                  <tr key={index} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="py-4 px-6 font-medium">{row[0]}</td>
                    <td className="py-4 px-6 text-center">{row[1]}</td>
                    <td className="py-4 px-6 text-center">{row[2]}</td>
                    <td className="py-4 px-6 text-center">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* M&A One-Shot Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl border-2 border-amber-600 p-10 text-white shadow-2xl"
        >
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
              <TrendingUp size={32} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl mb-3 font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                🏢 Accès M&A — Achat & Cession d'entreprise
              </h2>
              <p className="text-lg mb-1 text-white/90">
                Disponible en accès one-shot à <span className="font-bold">149€</span> — indépendant de votre abonnement
              </p>
              <ul className="space-y-2 mb-6 text-white/90">
                <li className="flex items-start gap-2">
                  <Check size={20} className="mt-0.5 flex-shrink-0" />
                  <span>Dépôt et consultation d'annonces complètes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={20} className="mt-0.5 flex-shrink-0" />
                  <span>Mise en relation directe acheteur / vendeur</span>
                </li>
              </ul>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white text-amber-600 rounded-full font-bold shadow-xl hover:shadow-2xl transition-all"
              >
                Découvrir l'offre M&A
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
