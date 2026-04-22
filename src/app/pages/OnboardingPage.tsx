import { motion } from 'motion/react';
import { useState } from 'react';
import { Rocket, User, Users, Building } from 'lucide-react';

export default function OnboardingPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const currentStep = 1;
  const totalSteps = 3;

  const profileTypes = [
    {
      id: 'porteur',
      icon: '🚀',
      title: 'Porteur de projet',
      description: 'J\'ai une idée ou un business à développer',
    },
    {
      id: 'talent',
      icon: '🧑‍💻',
      title: 'Talent / Expert',
      description: 'Je propose mes compétences',
    },
    {
      id: 'both',
      icon: '🤝',
      title: 'Les deux',
      description: 'Je cherche et je propose',
    },
    {
      id: 'acheteur',
      icon: '🏢',
      title: 'Acheteur / Repreneur',
      description: 'Je cherche une entreprise à acquérir',
    },
  ];

  const handleContinue = () => {
    if (selectedType) {
      console.log('Selected type:', selectedType);
      // Navigate to step 2
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-8 py-12">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-muted-foreground">
              Étape {currentStep} sur {totalSteps}
            </span>
            <span className="text-sm font-semibold text-accent">
              {Math.round((currentStep / totalSteps) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-2xl border-2 border-border p-12 shadow-lg"
        >
          {/* Title */}
          <h1 className="text-4xl font-bold text-primary mb-12 text-center">
            Vous êtes plutôt...
          </h1>

          {/* Profile Type Grid */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            {profileTypes.map((type, index) => (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedType(type.id)}
                className={`p-8 rounded-2xl border-3 transition-all text-left ${
                  selectedType === type.id
                    ? 'border-accent bg-accent/5 shadow-lg shadow-accent/20'
                    : 'border-border bg-card hover:border-accent/30 hover:shadow-md'
                }`}
              >
                <div className="text-5xl mb-4">{type.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-primary">
                  {type.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {type.description}
                </p>

                {/* Selection indicator */}
                {selectedType === type.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, type: 'spring' }}
                    className="mt-4 flex items-center gap-2 text-accent font-semibold"
                  >
                    <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                      <svg
                        width="12"
                        height="10"
                        viewBox="0 0 12 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1 5L4.5 8.5L11 1.5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-sm">Sélectionné</span>
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Continue Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={selectedType ? { scale: 1.02 } : {}}
            whileTap={selectedType ? { scale: 0.98 } : {}}
            onClick={handleContinue}
            disabled={!selectedType}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
              selectedType
                ? 'bg-accent text-white shadow-lg shadow-accent/25 hover:bg-accent/90 cursor-pointer'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
            }`}
          >
            Continuer
          </motion.button>
        </motion.div>

        {/* Helper Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          Vous pourrez modifier ce choix plus tard dans vos paramètres
        </motion.p>
      </div>
    </div>
  );
}
