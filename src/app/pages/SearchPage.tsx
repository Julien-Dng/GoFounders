import { motion } from 'motion/react';
import { useState } from 'react';
import { MapPin, Sparkles, Bookmark, Eye, Crown } from 'lucide-react';

export default function SearchPage() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState('Tous');
  const [selectedStage, setSelectedStage] = useState<string[]>([]);
  const [isAvailableNow, setIsAvailableNow] = useState(false);
  const [isFreeUser, setIsFreeUser] = useState(true); // Toggle for demo

  const profileTypes = [
    'Porteur de projet',
    'Talent',
    'Associé',
    'Repreneur',
  ];

  const sectors = [
    'Tous',
    'Tech',
    'Commerce',
    'Santé',
    'Finance',
    'Industrie',
    'Éducation',
    'Marketing',
  ];

  const projectStages = ['Idée', 'MVP', 'En croissance', 'Établi'];

  const highlightedProfiles = [
    {
      name: 'Sophie Martin',
      role: 'CTO & Co-fondatrice',
      location: 'Paris',
      stage: 'MVP',
      bio: 'Passionnée par l\'IA et la santé tech. Cherche co-fondateur business pour scaler une solution SaaS.',
      skills: ['React', 'Python', 'IA'],
      match: 95,
      avatar: 'SM',
    },
    {
      name: 'Thomas Dupont',
      role: 'Développeur Full-Stack',
      location: 'Lyon',
      stage: 'Idée',
      bio: 'Expert e-commerce et marketplaces. Recherche associé pour lancer une plateforme innovante.',
      skills: ['Node.js', 'AWS', 'DevOps'],
      match: 92,
      avatar: 'TD',
    },
    {
      name: 'Claire Bernard',
      role: 'Product Manager',
      location: 'Bordeaux',
      stage: 'En croissance',
      bio: 'Ex-Google, spécialiste produit B2B SaaS. Envie de rejoindre une aventure early-stage.',
      skills: ['Product', 'UX', 'Analytics'],
      match: 89,
      avatar: 'CB',
    },
  ];

  const allProfiles = [
    ...highlightedProfiles,
    {
      name: 'Marc Laurent',
      role: 'Commercial Senior',
      location: 'Marseille',
      stage: 'Établi',
      bio: 'Expert vente B2B avec 10 ans d\'expérience. Recherche projet rentable à développer.',
      skills: ['Sales', 'Négociation', 'B2B'],
      match: 87,
      avatar: 'ML',
    },
    {
      name: 'Emma Rousseau',
      role: 'Designer UI/UX',
      location: 'Toulouse',
      stage: 'MVP',
      bio: 'Créative et data-driven. Cherche startup tech pour apporter une vision design forte.',
      skills: ['Figma', 'Design System', 'Branding'],
      match: 84,
      avatar: 'ER',
    },
    {
      name: 'Alexandre Petit',
      role: 'Growth Marketer',
      location: 'Nantes',
      stage: 'En croissance',
      bio: 'Spécialiste acquisition et rétention. A scalé 3 startups de 0 à 1M€ ARR.',
      skills: ['SEO', 'Ads', 'Growth'],
      match: 82,
      avatar: 'AP',
    },
    {
      name: 'Julie Moreau',
      role: 'Data Scientist',
      location: 'Lille',
      stage: 'Idée',
      bio: 'PhD en Machine Learning. Envie de créer un produit IA avec impact social.',
      skills: ['Python', 'ML', 'Data Viz'],
      match: 79,
      avatar: 'JM',
    },
    {
      name: 'Nicolas Blanc',
      role: 'Investisseur',
      location: 'Nice',
      stage: 'Établi',
      bio: 'Business Angel cherchant à s\'impliquer opérationnellement dans une startup.',
      skills: ['Finance', 'Strategy', 'Levée de fonds'],
      match: 76,
      avatar: 'NB',
    },
  ];

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleStage = (stage: string) => {
    setSelectedStage((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedSector('Tous');
    setSelectedStage([]);
    setIsAvailableNow(false);
  };

  const ProfileCard = ({ profile, index, isLocked = false }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`bg-white rounded-2xl border-2 border-border p-6 shadow-sm hover:shadow-lg transition-all relative ${
        isLocked ? 'blur-sm' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
            {profile.avatar}
          </div>
          <div>
            <h3 className="font-bold text-lg">{profile.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 bg-accent text-white rounded-full text-xs font-semibold">
                {profile.role}
              </span>
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <Bookmark size={18} className="text-muted-foreground hover:text-accent" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <MapPin size={14} />
        <span>{profile.location}</span>
        <span className="px-2 py-0.5 bg-secondary rounded text-xs font-medium">
          {profile.stage}
        </span>
      </div>

      <p className="text-sm text-foreground/80 mb-4 line-clamp-2 leading-relaxed">
        {profile.bio}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {profile.skills.map((skill: string, i: number) => (
          <span
            key={i}
            className="px-3 py-1 bg-secondary text-foreground text-xs rounded-lg font-medium"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent rounded-full">
          <Sparkles size={14} />
          <span className="text-sm font-bold">{profile.match}% compatible</span>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Eye size={16} />
          Voir le profil
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen pt-24 pb-12 px-8 bg-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          {/* LEFT SIDEBAR */}
          <aside className="w-[280px] flex-shrink-0">
            <div className="bg-secondary rounded-2xl p-6 sticky top-28">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Filtrer les profils</h2>
                <button
                  onClick={resetFilters}
                  className="text-sm text-accent hover:underline font-medium"
                >
                  Réinitialiser
                </button>
              </div>

              <div className="space-y-6">
                {/* Type de profil */}
                <div>
                  <label className="block text-sm font-bold mb-3">Type de profil</label>
                  <div className="space-y-2">
                    {profileTypes.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(type)}
                          onChange={() => toggleType(type)}
                          className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                        />
                        <span className="text-sm group-hover:text-accent transition-colors">
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Secteur */}
                <div>
                  <label className="block text-sm font-bold mb-3">Secteur</label>
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-border rounded-lg focus:border-accent outline-none text-sm cursor-pointer"
                  >
                    {sectors.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stade du projet */}
                <div>
                  <label className="block text-sm font-bold mb-3">Stade du projet</label>
                  <div className="flex flex-wrap gap-2">
                    {projectStages.map((stage) => (
                      <button
                        key={stage}
                        onClick={() => toggleStage(stage)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedStage.includes(stage)
                            ? 'bg-accent text-white shadow-md'
                            : 'bg-white border border-border hover:border-accent'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Localisation */}
                <div>
                  <label className="block text-sm font-bold mb-3">Localisation</label>
                  <input
                    type="text"
                    placeholder="France entière"
                    className="w-full px-3 py-2.5 bg-white border border-border rounded-lg focus:border-accent outline-none text-sm"
                  />
                </div>

                {/* Disponibilité */}
                <div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-bold">Disponible maintenant</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isAvailableNow}
                        onChange={(e) => setIsAvailableNow(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-border rounded-full peer-checked:bg-accent transition-colors"></div>
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN AREA */}
          <div className="flex-1">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-8">
              <div className="text-lg">
                <span className="font-bold text-primary">1247</span>
                <span className="text-muted-foreground"> profils</span>
              </div>
              <select className="px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-accent outline-none text-sm font-medium cursor-pointer">
                <option>Pertinence IA</option>
                <option>Plus récents</option>
                <option>Compatibilité décroissante</option>
                <option>Localisation</option>
              </select>
            </div>

            {/* AI Match Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-r from-accent to-primary rounded-2xl p-6 mb-8 text-white shadow-lg"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={24} />
                <h2 className="text-xl font-bold">
                  ✨ 8 profils correspondent particulièrement à votre projet
                </h2>
              </div>

              {/* Horizontal Scroll */}
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                {highlightedProfiles.map((profile, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex-shrink-0 w-80 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                        {profile.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{profile.name}</h3>
                        <div className="text-sm opacity-90">{profile.role}</div>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-white/20 rounded-full">
                        <Sparkles size={12} />
                        <span className="text-sm font-bold">{profile.match}%</span>
                      </div>
                    </div>
                    <p className="text-sm opacity-90 line-clamp-2 mb-3">{profile.bio}</p>
                    <button className="w-full py-2 bg-white text-accent rounded-lg text-sm font-semibold hover:bg-white/95 transition-colors">
                      Voir le profil
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Profile Grid */}
            <div className="grid grid-cols-3 gap-6 relative">
              {allProfiles.map((profile, index) => (
                <ProfileCard
                  key={index}
                  profile={profile}
                  index={index}
                  isLocked={isFreeUser && index >= 6}
                />
              ))}

              {/* Free User Lock Overlay */}
              {isFreeUser && (
                <div className="absolute top-[calc(100%/3*2)] left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-accent p-10 shadow-2xl max-w-md pointer-events-auto text-center"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-6">
                      <Crown size={40} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Passez en PRO</h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      Débloquez l'accès à tous les profils et boostez vos chances de trouver le match parfait
                    </p>
                    <button className="w-full py-4 bg-accent text-white rounded-lg font-bold text-lg shadow-lg hover:bg-accent/90 transition-colors mb-3">
                      Découvrir PRO - 49€/mois
                    </button>
                    <button
                      onClick={() => setIsFreeUser(false)}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Aperçu démo (pour ce test)
                    </button>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
