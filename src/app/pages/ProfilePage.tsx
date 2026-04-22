import { motion } from 'motion/react';
import { useState } from 'react';
import { MapPin, Sparkles, MessageSquare, Bookmark, Shield, Lock, Flag, CheckCircle } from 'lucide-react';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('presentation');
  const [isBookmarked, setIsBookmarked] = useState(false);

  const tabs = [
    { id: 'presentation', label: 'Présentation' },
    { id: 'projet', label: 'Projet' },
    { id: 'experience', label: 'Expérience' },
    { id: 'avis', label: 'Avis' },
  ];

  const searchingFor = [
    'Co-fondateur technique',
    'CTO',
    'Développeur Full-Stack',
    'Expert en IA',
  ];

  const skills = [
    'Product Management',
    'Fundraising',
    'Business Development',
    'SaaS',
    'B2B',
    'Growth',
    'Strategy',
    'Pitching',
    'Leadership',
  ];

  const quickInfo = [
    { label: 'Secteur', value: 'Tech / SaaS' },
    { label: 'Stade', value: 'MVP validé' },
    { label: 'Type de collaboration', value: 'Co-fondateur / Associé' },
    { label: 'Apport possible', value: 'Vision produit, business dev, levée de fonds' },
  ];

  return (
    <div className="min-h-screen bg-secondary pt-20">
      {/* COVER BANNER */}
      <div className="relative h-64 bg-gradient-to-br from-accent via-primary to-accent overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 1000 400">
            <circle cx="200" cy="100" r="150" fill="white" opacity="0.1" />
            <circle cx="800" cy="300" r="200" fill="white" opacity="0.15" />
            <circle cx="500" cy="200" r="100" fill="white" opacity="0.1" />
          </svg>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-[1400px] mx-auto px-8 -mt-32 pb-12">
        <div className="grid grid-cols-12 gap-8">
          {/* LEFT & CENTER COLUMN */}
          <div className="col-span-8">
            {/* PROFILE HEADER CARD */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl border-2 border-border shadow-xl p-8 mb-6"
            >
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    SB
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle size={20} className="text-white" fill="currentColor" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold">Sophie Bernard</h1>
                        <span className="px-3 py-1 bg-accent text-white rounded-full text-sm font-semibold">
                          CEO & Fondatrice
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-3">
                        <MapPin size={16} />
                        <span>Paris, France</span>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full">
                        <Sparkles size={16} />
                        <span className="font-bold">87% compatible</span>
                        <span className="text-sm">avec votre profil</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-semibold shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
                    >
                      <MessageSquare size={18} />
                      Envoyer un message
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsBookmarked(!isBookmarked)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border-2 transition-all ${
                        isBookmarked
                          ? 'bg-accent/10 border-accent text-accent'
                          : 'border-border hover:border-accent'
                      }`}
                    >
                      <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                      {isBookmarked ? 'Sauvegardé' : 'Sauvegarder'}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* TABS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl border-2 border-border shadow-lg mb-6"
            >
              <div className="border-b border-border px-2">
                <div className="flex gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-6 py-4 font-semibold transition-all relative ${
                        activeTab === tab.id
                          ? 'text-accent'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB CONTENT */}
              <div className="p-8">
                {activeTab === 'presentation' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    {/* À propos */}
                    <div>
                      <h3 className="text-xl font-bold mb-4">À propos</h3>
                      <p className="text-foreground/80 leading-relaxed">
                        Passionnée par l'intersection entre IA et santé, j'ai créé HealthAI, une plateforme SaaS qui aide
                        les praticiens à optimiser leur diagnostic grâce à l'intelligence artificielle. Avec 5 ans
                        d'expérience en product management chez Google Health, j'ai validé le MVP avec 50 médecins pilotes
                        et généré les premiers revenus.
                        <br /><br />
                        Je recherche maintenant un co-fondateur technique (CTO) qui partage ma vision d'améliorer
                        l'accès aux soins de qualité et qui maîtrise le développement d'IA en production. L'objectif
                        est de scaler le produit et lever une série A dans les 12 mois.
                      </p>
                    </div>

                    {/* Ce que je recherche */}
                    <div>
                      <h3 className="text-xl font-bold mb-4">Ce que je recherche</h3>
                      <div className="flex flex-wrap gap-3">
                        {searchingFor.map((item, index) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-accent/10 text-accent rounded-lg font-semibold border border-accent/20"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Compétences */}
                    <div>
                      <h3 className="text-xl font-bold mb-4">Compétences</h3>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-accent/10 hover:text-accent transition-colors cursor-default"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Disponibilité */}
                    <div>
                      <h3 className="text-xl font-bold mb-4">Disponibilité</h3>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Disponible immédiatement pour démarrer
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'projet' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Détails du projet à venir...
                  </motion.div>
                )}

                {activeTab === 'experience' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Parcours professionnel à venir...
                  </motion.div>
                )}

                {activeTab === 'avis' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Avis et recommandations à venir...
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="col-span-4 space-y-6">
            {/* Quick Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-2xl border-2 border-border shadow-lg p-6"
            >
              <h3 className="text-lg font-bold mb-4">Informations clés</h3>
              <div className="space-y-4">
                {quickInfo.map((info, index) => (
                  <div key={index} className="pb-4 border-b border-border last:border-0 last:pb-0">
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      {info.label}
                    </div>
                    <div className="font-semibold text-foreground">{info.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* NDA Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 shadow-lg p-6 relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                    <Shield size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold">Détails confidentiels</h3>
                </div>
                <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
                  Accédez aux informations complètes du projet (metrics, traction, roadmap) en signant un NDA digital.
                </p>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors shadow-md">
                  <Lock size={18} />
                  Signer le NDA
                </button>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Fonctionnalité PRO uniquement
                </p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16"></div>
            </motion.div>

            {/* Report Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center"
            >
              <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors">
                <Flag size={14} />
                Signaler ce profil
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
