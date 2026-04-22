import { motion } from 'motion/react';
import { useState } from 'react';
import { Sparkles, Crown, Send, Target, Eye, TrendingUp, User } from 'lucide-react';

export default function AIAssistantPage() {
  const [message, setMessage] = useState('');
  const [isProUser, setIsProUser] = useState(false); // Toggle for demo

  const suggestedQuestions = [
    'Pourquoi si peu de matches ?',
    'Comment améliorer mon profil ?',
    'Quel profil me correspond le mieux ?',
    'Comment aborder un premier contact ?',
  ];

  const chatHistory = [
    {
      type: 'user',
      text: 'Pourquoi je n\'ai pas eu de matches cette semaine ?',
    },
    {
      type: 'ai',
      text: 'En analysant votre profil, j\'ai remarqué 3 points à améliorer : votre secteur n\'est pas renseigné, vous n\'avez pas de photo, et votre description fait moins de 50 mots. Les profils complets reçoivent en moyenne 4x plus de matches.',
      actions: [
        { label: 'Compléter mon profil', icon: User },
        { label: 'Voir mes matches', icon: Target },
        { label: 'En savoir plus', icon: Sparkles },
      ],
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      console.log('Sending:', message);
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-secondary pt-20">
      {/* HEADER */}
      <div className="bg-white border-b border-border">
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-start justify-between"
          >
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Sparkles size={36} className="text-accent" />
                Mon Assistant GoFounders
              </h1>
              <p className="text-lg text-muted-foreground">
                Votre assistant personnel — il connaît votre profil et vos matches
              </p>
            </div>
            <div className="px-4 py-2 bg-accent/10 text-accent rounded-full flex items-center gap-2 font-semibold">
              <Crown size={18} />
              <span>PRO</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-12 gap-8 relative">
          {/* LEFT COLUMN - Context Panel */}
          <div className="col-span-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={`bg-card rounded-2xl border border-border p-6 sticky top-28 ${!isProUser ? 'blur-sm' : ''}`}
            >
              <h2 className="text-xl font-bold mb-6">Ce que je sais sur vous</h2>

              {/* Votre profil */}
              <div className="mb-6 pb-6 border-b border-border">
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-3">
                  Votre profil
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                    <span>Secteur: Tech / SaaS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                    <span>Stade: MVP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                    <span>Recherche: CTO, Développeur</span>
                  </div>
                </div>
              </div>

              {/* Vos matches */}
              <div className="mb-6 pb-6 border-b border-border">
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-3">
                  Vos matches
                </h3>
                <div className="text-sm">
                  <div className="font-semibold mb-1">8 matches actifs</div>
                  <div className="text-muted-foreground">2 nouveaux cette semaine</div>
                </div>
              </div>

              {/* Votre activité */}
              <div className="mb-6 pb-6 border-b border-border">
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-3">
                  Votre activité
                </h3>
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={16} className="text-accent" />
                    <span>Profil consulté 24 fois ce mois</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-accent" />
                    <span>+12% vs mois dernier</span>
                  </div>
                </div>
              </div>

              {/* Questions suggérées */}
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-3">
                  Questions suggérées
                </h3>
                <div className="space-y-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-4 py-2.5 bg-white hover:bg-accent/5 border border-border hover:border-accent rounded-lg text-sm transition-all group"
                    >
                      <span className="group-hover:text-accent">{question}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN - Chat Interface */}
          <div className="col-span-9">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`bg-white rounded-2xl border border-border shadow-lg flex flex-col h-[calc(100vh-240px)] ${!isProUser ? 'blur-sm' : ''}`}
            >
              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-4 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.type === 'ai' && (
                      <div className="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles size={20} className="text-white" />
                      </div>
                    )}

                    <div className={`max-w-2xl ${msg.type === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`rounded-2xl p-4 ${
                          msg.type === 'user'
                            ? 'bg-accent text-white'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>

                      {msg.actions && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {msg.actions.map((action, i) => {
                            const Icon = action.icon;
                            return (
                              <button
                                key={i}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-border hover:border-accent rounded-lg text-sm font-medium transition-all hover:bg-accent/5 group"
                              >
                                <Icon size={16} className="text-muted-foreground group-hover:text-accent" />
                                <span className="group-hover:text-accent">{action.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {msg.type === 'user' && (
                      <div className="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        MJ
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input Bar */}
              <div className="border-t border-border p-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Posez votre question à votre assistant..."
                    className="flex-1 px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                      message.trim()
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    <Send size={18} />
                    Envoyer
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* LOCKED OVERLAY FOR FREE USERS */}
          {!isProUser && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-accent p-12 shadow-2xl max-w-xl pointer-events-auto text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Crown size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Fonctionnalité PRO</h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Votre assistant connaît votre profil et vos données pour vous donner des conseils
                  vraiment personnalisés
                </p>
                <button className="w-full py-4 bg-accent text-white rounded-lg font-bold text-lg shadow-lg hover:bg-accent/90 transition-colors mb-3">
                  Passer en PRO — 49€/mois
                </button>
                <button
                  onClick={() => setIsProUser(true)}
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
  );
}
