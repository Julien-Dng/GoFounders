import { motion } from 'motion/react';
import { Check, X, Crown } from 'lucide-react';

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  badge?: string;
  features: Array<{ text: string; included: boolean }>;
  cta: string;
  variant: 'free' | 'pro' | 'premium';
}

export default function PricingCard({
  name,
  price,
  period,
  description,
  badge,
  features,
  cta,
  variant,
}: PricingCardProps) {
  const variantStyles = {
    free: {
      bg: 'bg-card',
      border: 'border-border',
      buttonBg: 'bg-background hover:bg-primary hover:text-primary-foreground',
      buttonText: 'text-foreground',
    },
    pro: {
      bg: 'bg-accent',
      border: 'border-accent',
      buttonBg: 'bg-white hover:bg-primary',
      buttonText: 'text-accent hover:text-primary-foreground',
      scale: 1.05,
    },
    premium: {
      bg: 'bg-primary',
      border: 'border-primary',
      buttonBg: 'bg-white hover:bg-accent',
      buttonText: 'text-primary hover:text-accent-foreground',
    },
  };

  const style = variantStyles[variant];

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className={`relative rounded-2xl p-8 border-2 ${style.bg} ${style.border} ${
        variant === 'pro' ? 'shadow-2xl shadow-accent/20 scale-105' : 'shadow-lg'
      } transition-all h-full flex flex-col`}
      style={{
        color: variant === 'pro' ? '#ffffff' : variant === 'premium' ? '#ffffff' : undefined,
      }}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-accent rounded-full text-sm font-semibold shadow-lg flex items-center gap-2">
          <Crown size={14} />
          {badge}
        </div>
      )}

      <div className="mb-8">
        <div className="text-sm font-semibold mb-2 opacity-90">{name}</div>
        <div className="flex items-end gap-1 mb-2">
          <span className="text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
            {price}
          </span>
          <span className="text-lg opacity-70 mb-2">{period}</span>
        </div>
        <p className="opacity-80">{description}</p>
      </div>

      <div className="flex-1 mb-8">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              {feature.included ? (
                <Check size={20} className="mt-0.5 flex-shrink-0" />
              ) : (
                <X size={20} className="mt-0.5 flex-shrink-0 opacity-30" />
              )}
              <span className={feature.included ? '' : 'opacity-50'}>{feature.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full py-4 rounded-full font-semibold transition-all ${style.buttonBg} ${style.buttonText}`}
      >
        {cta}
      </motion.button>
    </motion.div>
  );
}
