import { motion } from 'motion/react';
import { MapPin, Sparkles, ArrowRight } from 'lucide-react';

interface EntrepreneurProfileCardProps {
  avatar: string;
  name: string;
  location: string;
  stage: 'Idée' | 'MVP' | 'En croissance' | 'Établi';
  sector: string;
  pitch: string;
  looking: string[];
  matchScore?: number;
  highlighted?: boolean;
}

export default function EntrepreneurProfileCard({
  avatar,
  name,
  location,
  stage,
  sector,
  pitch,
  looking,
  matchScore,
  highlighted = false,
}: EntrepreneurProfileCardProps) {
  const stageColors = {
    'Idée': 'bg-blue-100 text-blue-700',
    'MVP': 'bg-green-100 text-green-700',
    'En croissance': 'bg-orange-100 text-orange-700',
    'Établi': 'bg-purple-100 text-purple-700',
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`bg-white rounded-2xl border-2 p-6 transition-all ${
        highlighted
          ? 'border-accent shadow-xl shadow-accent/10'
          : 'border-border shadow-md hover:shadow-xl'
      }`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-2xl font-bold">
          {name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-xl font-semibold">{name}</h3>
            {matchScore && (
              <div className="flex items-center gap-1 px-3 py-1 bg-accent/10 text-accent rounded-full">
                <Sparkles size={14} />
                <span className="text-sm font-semibold">{matchScore}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={14} />
            <span>{location}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stageColors[stage]}`}>
          {stage}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-muted/30 text-foreground">
          {sector}
        </span>
      </div>

      <p className="text-foreground/80 mb-4 line-clamp-2 leading-relaxed">
        {pitch}
      </p>

      <div className="mb-4">
        <div className="text-xs font-semibold text-muted-foreground mb-2">RECHERCHE</div>
        <div className="flex flex-wrap gap-2">
          {looking.map((item, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-card text-foreground text-sm rounded-lg border border-border"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 bg-primary text-primary-foreground rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
      >
        Voir le profil
        <ArrowRight size={18} />
      </motion.button>
    </motion.div>
  );
}
