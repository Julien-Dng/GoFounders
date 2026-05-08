import { motion } from 'motion/react';
import { useState } from 'react';
import { TrendingUp, Building, ShoppingCart, Users, MapPin, Lock, Bookmark, Eye } from 'lucide-react';

export default function MAMarketplacePage() {
  const [selectedSector, setSelectedSector] = useState('Tous');
  const [selectedType, setSelectedType] = useState('Tous');
  const [hasMAAccess, setHasMAAccess] = useState(false); // Toggle for demo

  const sectors = [
    'Tous',
    'E-commerce',
    'SaaS',
    'Commerce de détail',
    'Restauration',
    'Services B2B',
    'Industrie',
  ];

  const types = ['Tous', 'Cession', 'Fonds de commerce', 'Parts sociales'];

  const listings = [
    {
      id: 'MA-001',
      sector: 'E-commerce',
      icon: ShoppingCart,
      region: 'Île-de-France',
      revenue: '280k€/an',
      margin: '22%',
      age: '7 ans',
      reason: 'Retraite du dirigeant',
      priceMin: '350k€',
      priceMax: '420k€',
      description: 'Boutique en ligne de produits bio avec base clients fidèle et marque établie.',
    },
    {
      id: 'MA-002',
      sector: 'SaaS',
      icon: Building,
      region: 'Auvergne-Rhône-Alpes',
      revenue: '450k€/an',
      margin: '35%',
      age: '4 ans',
      reason: 'Pivot vers nouveau projet',
      priceMin: '800k€',
      priceMax: '1.2M€',
      description: 'Plateforme B2B SaaS avec 120 clients récurrents et croissance stable.',
    },
    {
      id: 'MA-003',
      sector: 'Restauration',
      icon: Users,
      region: 'Provence-Alpes-Côte d\'Azur',
      revenue: '320k€/an',
      margin: '18%',
      age: '12 ans',
      reason: 'Reconversion professionnelle',
      priceMin: '280k€',
      priceMax: '350k€',
      description: 'Restaurant établi avec emplacement premium et clientèle régulière.',
    },
    {
      id: 'MA-004',
      sector: 'Services B2B',
      icon: Building,
      region: 'Nouvelle-Aquitaine',
      revenue: '180k€/an',
      margin: '28%',
      age: '5 ans',
      reason: 'Déménagement à l\'étranger',
      priceMin: '200k€',
      priceMax: '280k€',
      description: 'Agence de consulting RH avec contrats récurrents et forte réputation.',
    },
    {
      id: 'MA-005',
      sector: 'E-commerce',
      icon: ShoppingCart,
      region: 'Occitanie',
      revenue: '520k€/an',
      margin: '25%',
      age: '6 ans',
      reason: 'Focus sur activité principale',
      priceMin: '650k€',
      priceMax: '780k€',
      description: 'Marketplace niche avec forte notoriété et automatisation complète.',
    },
    {
      id: 'MA-006',
      sector: 'Commerce de détail',
      icon: Building,
      region: 'Hauts-de-France',
      revenue: '380k€/an',
      margin: '20%',
      age: '15 ans',
      reason: 'Retraite anticipée',
      priceMin: '420k€',
      priceMax: '520k€',
      description: 'Boutique physique avec local commercial en propriété et équipe formée.',
    },
  ];

  const stats = [
    '120+ entreprises listées',
    'Transactions de 50k€ à 5M€',
    'NDA digital inclus',
  ];

  const ListingCard = ({ listing, index }: any) => {
    const Icon = listing.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        className="bg-white rounded-2xl border-2 border-border shadow-md hover:shadow-xl transition-all relative overflow-hidden"
      >
        {!hasMAAccess && (
          <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center p-8 max-w-sm">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Accès one-shot M&A</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Débloquez toutes les annonces détaillées pour 149€
              </p>
              <button className="w-full py-3 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-colors shadow-lg mb-2">
                Acheter l'accès — 149€
              </button>
              <button
                onClick={() => setHasMAAccess(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Aperçu démo (pour ce test)
              </button>
            </div>
          </div>
        )}

        <div className={hasMAAccess ? 'p-6' : 'p-6 blur-sm'}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Icon size={24} className="text-amber-600" />
              </div>
              <div>
                <div className="text-xs font-mono text-muted-foreground mb-1">{listing.id}</div>
                <div className="font-bold text-foreground">Entreprise confidentielle</div>
              </div>
            </div>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <Bookmark size={18} className="text-muted-foreground hover:text-amber-500" />
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-700 rounded-lg text-sm font-semibold">
              {listing.sector}
            </span>
            <span className="px-3 py-1 bg-secondary text-foreground rounded-lg text-sm font-semibold flex items-center gap-1">
              <MapPin size={14} />
              {listing.region}
            </span>
          </div>

          <p className="text-sm text-foreground/70 mb-4 leading-relaxed">
            {listing.description}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-border">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Chiffre d'affaires</div>
              <div className="font-bold text-sm">{listing.revenue}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Marge nette</div>
              <div className="font-bold text-sm">{listing.margin}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Ancienneté</div>
              <div className="font-bold text-sm">{listing.age}</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-1">Raison de la cession</div>
            <div className="text-sm font-medium">{listing.reason}</div>
          </div>

          <div className="flex items-end justify-between pt-4 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Prix demandé</div>
              <div className="text-2xl font-bold text-amber-600">
                {listing.priceMin} — {listing.priceMax}
              </div>
            </div>
            <button className="px-6 py-2.5 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors shadow-md flex items-center gap-2">
              <Eye size={18} />
              Voir l'annonce
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* TOP HERO - DARK NAVY BAND */}
      <section className="bg-primary text-primary-foreground pt-32 pb-16 px-8">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <TrendingUp size={40} className="text-white" />
            </div>

            <h1 className="text-5xl font-bold mb-4">
              Marketplace M&A — Achat & Cession d'entreprise
            </h1>

            <p className="text-xl opacity-90 mb-8 max-w-3xl mx-auto">
              Trouvez votre prochaine acquisition ou cédez votre entreprise en toute confidentialité
            </p>

            <div className="flex items-center justify-center gap-4 mb-12">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-amber-500 text-white rounded-lg font-bold shadow-2xl hover:bg-amber-600 transition-colors"
              >
                Voir les annonces
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 border-2 border-white text-white rounded-lg font-bold hover:bg-white/10 transition-colors"
              >
                Déposer une annonce — 149€
              </motion.button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-12">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-lg font-semibold opacity-90">{stat}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FILTERS BAR */}
      <section className="bg-white border-b-2 border-border shadow-sm sticky top-20 z-30">
        <div className="max-w-[1400px] mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            {/* Secteur */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-muted-foreground mb-2">SECTEUR</label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-amber-500 outline-none text-sm font-medium cursor-pointer"
              >
                {sectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>

            {/* CA */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-muted-foreground mb-2">CA ANNUEL</label>
              <select className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-amber-500 outline-none text-sm font-medium cursor-pointer">
                <option>Tous</option>
                <option>0 - 100k€</option>
                <option>100k€ - 500k€</option>
                <option>500k€ - 1M€</option>
                <option>1M€+</option>
              </select>
            </div>

            {/* Prix */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-muted-foreground mb-2">PRIX DEMANDÉ</label>
              <select className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-amber-500 outline-none text-sm font-medium cursor-pointer">
                <option>Tous</option>
                <option>0 - 250k€</option>
                <option>250k€ - 500k€</option>
                <option>500k€ - 1M€</option>
                <option>1M€+</option>
              </select>
            </div>

            {/* Région */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-muted-foreground mb-2">RÉGION</label>
              <input
                type="text"
                placeholder="Toute la France"
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-amber-500 outline-none text-sm"
              />
            </div>

            {/* Type */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-muted-foreground mb-2">TYPE</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-amber-500 outline-none text-sm font-medium cursor-pointer"
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ANNONCES GRID */}
      <section className="py-12 px-8">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="text-lg">
              <span className="font-bold text-primary">{listings.length}</span>
              <span className="text-muted-foreground"> annonces disponibles</span>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-8">
            {listings.map((listing, index) => (
              <ListingCard key={listing.id} listing={listing} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA - AMBER BACKGROUND */}
      <section className="bg-gradient-to-br from-amber-500 to-orange-600 text-white py-20 px-8">
        <div className="max-w-[1400px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <Building size={40} className="text-white" />
            </div>

            <h2 className="text-4xl font-bold mb-4">
              Vous souhaitez vendre votre entreprise ?
            </h2>

            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Déposez votre annonce en 10 minutes — Accès one-shot 149€
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 bg-white text-amber-600 rounded-lg font-bold text-lg shadow-2xl hover:bg-white/95 transition-colors"
            >
              Déposer mon annonce
            </motion.button>

            <div className="mt-8 flex items-center justify-center gap-8 text-sm opacity-90">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                <span>Confidentialité garantie</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                <span>NDA digital inclus</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                <span>Validation en 24h</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
