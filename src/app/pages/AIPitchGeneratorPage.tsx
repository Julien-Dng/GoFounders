import { motion } from 'motion/react';
import { useState } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, Download, Copy, Lock, Crown } from 'lucide-react';
import { Link } from 'react-router';

export default function AIPitchGeneratorPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isProUser, setIsProUser] = useState(false); // Toggle for demo
  const totalSteps = 5;

  const steps = [
    {
      number: 1,
      title: 'Votre projet',
      question: 'Décrivez votre projet en quelques mots',
      placeholder: 'Ex: Une plateforme SaaS qui aide les PME à gérer leurs stocks...',
    },
    {
      number: 2,
      title: 'Votre cible',
      question: 'Qui sont vos clients idéaux ?',
      placeholder: 'Ex: PME de 10 à 50 employés dans le secteur du commerce...',
    },
    {
      number: 3,
      title: 'Le problème',
      question: 'Quel problème résolvez-vous ?',
      placeholder: 'Ex: Les PME perdent du temps avec des outils de gestion obsolètes...',
    },
    {
      number: 4,
      title: 'Votre solution',
      question: 'Comment résolvez-vous ce problème ?',
      placeholder: 'Ex: Notre solution automatise la gestion des stocks avec de l\'IA...',
    },
    {
      number: 5,
      title: 'Votre avantage',
      question: 'Qu\'est-ce qui vous différencie ?',
      placeholder: 'Ex: Nous sommes les seuls à offrir une intégration complète avec...',
    },
  ];

  const generatedPitch = `🚀 **Révolutionnez la gestion de vos stocks**

Notre plateforme SaaS aide les PME de 10 à 50 employés à optimiser leur gestion des stocks grâce à l'intelligence artificielle.

**Le problème:** Les PME perdent en moyenne 15 heures par semaine avec des outils de gestion obsolètes et inefficaces.

**Notre solution:** Une plateforme tout-en-un qui automatise 80% des tâches de gestion, réduit les erreurs de 95% et permet des économies de 30% sur les coûts opérationnels.

**Notre différence:** La seule solution qui s'intègre nativement avec tous les logiciels de comptabilité français, avec un ROI démontré en moins de 3 mois.

**Traction:** 150 clients actifs, 98% de satisfaction, croissance de 40% MoM.

💼 Nous recherchons un CTO passionné pour scaler notre produit à l'échelle nationale.`;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-8 bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full mb-6">
            <Sparkles size={16} />
            <span className="text-sm font-semibold">Fonctionnalité PRO</span>
          </div>
          <h1
            className="text-5xl mb-4 tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Générateur de Pitch IA
          </h1>
          <p className="text-lg text-muted-foreground">
            Créez un pitch convaincant en 5 étapes avec l'aide de l'intelligence artificielle
          </p>
        </motion.div>

        {!isProUser ? (
          /* Locked Overlay for Free Users */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Blurred Preview */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-border">
              <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-md flex items-center justify-center">
                <div className="text-center max-w-md p-8">
                  <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={40} className="text-white" />
                  </div>
                  <h2 className="text-3xl mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                    Fonctionnalité PRO
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Le générateur de pitch IA est réservé aux abonnés PRO et PREMIUM. Passez à PRO pour créer des pitchs professionnels en quelques minutes.
                  </p>
                  <div className="space-y-3">
                    <Link to="/tarifs">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full px-8 py-4 bg-accent text-accent-foreground rounded-full font-semibold shadow-xl flex items-center justify-center gap-2"
                      >
                        <Crown size={20} />
                        Passer à PRO - 49€/mois
                      </motion.button>
                    </Link>
                    <button
                      onClick={() => setIsProUser(true)}
                      className="w-full px-8 py-3 text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      Aperçu démo (pour ce test)
                    </button>
                  </div>
                </div>
              </div>

              {/* Blurred Content */}
              <div className="blur-sm p-8 select-none pointer-events-none">
                <div className="bg-card rounded-xl p-6 mb-6">
                  <div className="h-8 bg-muted/30 rounded w-3/4 mb-4"></div>
                  <div className="h-32 bg-muted/30 rounded"></div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Unlocked Generator for PRO Users */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Progress Bar */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-muted-foreground">
                  Étape {currentStep} sur {totalSteps}
                </span>
                <span className="text-sm font-semibold text-accent">
                  {Math.round((currentStep / totalSteps) * 100)}% complété
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent to-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {currentStep <= totalSteps ? (
              /* Step Form */
              <div className="bg-card rounded-2xl border border-border p-8 mb-6">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="mb-6">
                    <h2 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                      {steps[currentStep - 1].title}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      {steps[currentStep - 1].question}
                    </p>
                  </div>

                  <textarea
                    placeholder={steps[currentStep - 1].placeholder}
                    rows={6}
                    className="w-full px-4 py-4 bg-input-background rounded-xl border-2 border-input focus:border-accent outline-none transition-colors resize-none"
                  />
                </motion.div>
              </div>
            ) : (
              /* Generated Pitch Preview */
              <div className="bg-card rounded-2xl border-2 border-accent p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">Votre pitch est prêt !</h2>
                    <p className="text-muted-foreground">Généré par l'IA en quelques secondes</p>
                  </div>
                </div>

                <div className="bg-background rounded-xl p-6 mb-6">
                  <pre className="whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                    {generatedPitch}
                  </pre>
                </div>

                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-4 bg-accent text-accent-foreground rounded-full font-semibold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download size={20} />
                    Télécharger en PDF
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-4 bg-card border-2 border-border rounded-full font-semibold flex items-center justify-center gap-2 hover:border-accent transition-colors"
                  >
                    <Copy size={20} />
                    Copier le texte
                  </motion.button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {currentStep <= totalSteps && (
              <div className="flex items-center justify-between">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePrev}
                  disabled={currentStep === 1}
                  className={`px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-all ${
                    currentStep === 1
                      ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                      : 'bg-card border-2 border-border hover:border-primary'
                  }`}
                >
                  <ChevronLeft size={20} />
                  Précédent
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNext}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold flex items-center gap-2 shadow-lg"
                >
                  {currentStep === totalSteps ? 'Générer mon pitch' : 'Suivant'}
                  <ChevronRight size={20} />
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
