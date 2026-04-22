import { motion } from 'motion/react';
import { Link } from 'react-router';
import { User, Sparkles, Handshake, Users, Briefcase, Building, Star, TrendingUp, CheckCircle } from 'lucide-react';
import Footer from '../components/Footer';

export default function LandingPage() {
  const trustBadges = [
    'Gratuit pour commencer',
    'Matching IA',
    '+200 mises en relation réussies',
  ];

  const steps = [
    {
      icon: User,
      title: 'Créez votre profil',
      description: 'Décrivez votre projet et vos besoins en quelques minutes',
    },
    {
      icon: Sparkles,
      title: 'Notre IA trouve vos matches',
      description: 'Algorithme intelligent pour des suggestions pertinentes',
    },
    {
      icon: Handshake,
      title: 'Entrez en contact',
      description: 'Échangez directement avec vos futurs associés',
    },
  ];

  const useCases = [
    {
      icon: '🤝',
      title: 'Je cherche un associé ou co-fondateur',
      description: 'Trouvez la personne qui partagera votre vision et complétera vos compétences pour bâtir ensemble.',
      color: '#2563EB',
    },
    {
      icon: '💼',
      title: 'Je cherche un talent (dev, commercial, expert)',
      description: 'Recrutez des profils qualifiés prêts à rejoindre votre aventure entrepreneuriale.',
      color: '#2563EB',
    },
    {
      icon: '🏢',
      title: 'J\'achète ou je vends une entreprise',
      description: 'Accédez à notre marketplace M&A pour des transactions sécurisées et confidentielles.',
      color: '#D97706',
    },
  ];

  const stats = [
    { value: '500+', label: 'projets' },
    { value: '1200+', label: 'profils' },
    { value: '200+', label: 'mises en relation' },
    { value: '4.8/5', label: '⭐' },
  ];

  const testimonials = [
    {
      name: 'Sophie Martin',
      role: 'CEO, TechFlow',
      avatar: 'SM',
      quote: 'J\'ai trouvé mon CTO en 2 semaines grâce à GoFounders. Le matching IA est bluffant !',
    },
    {
      name: 'Thomas Dupont',
      role: 'Fondateur, GreenBox',
      avatar: 'TD',
      quote: 'Une plateforme qui comprend vraiment les besoins des entrepreneurs. Recommande à 100%.',
    },
    {
      name: 'Claire Rousseau',
      role: 'Co-fondatrice, Educare',
      avatar: 'CR',
      quote: 'Le processus est fluide et les profils sont de grande qualité. Excellent service.',
    },
  ];

  const pricingPreview = [
    { name: 'FREE', price: '0€', popular: false },
    { name: 'PRO', price: '49€/mois', popular: true },
    { name: 'PREMIUM', price: 'Sur mesure', popular: false },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full mb-6">
                <span className="text-2xl">🚀</span>
                <span className="text-sm font-semibold">+500 projets actifs</span>
              </div>

              {/* Headline */}
              <h1 className="text-6xl font-bold mb-6 leading-tight text-primary">
                Trouvez l'associé qui fera décoller votre business
              </h1>

              {/* Subtitle */}
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Mettez en relation votre projet avec les meilleurs talents, co-fondateurs et repreneurs d'entreprise.
              </p>

              {/* CTAs */}
              <div className="flex items-center gap-4 mb-8">
                <Link to="/recherche">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-accent text-white rounded-lg font-semibold shadow-lg shadow-accent/25 hover:bg-accent/90 transition-colors"
                  >
                    Déposer mon projet
                  </motion.button>
                </Link>
                <Link to="/recherche">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 border-2 border-border text-foreground rounded-lg font-semibold hover:border-accent transition-colors"
                  >
                    Explorer les profils
                  </motion.button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4">
                {trustBadges.map((badge, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle size={16} className="text-accent" />
                    <span>{badge}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              {/* Network Visualization */}
              <div className="relative w-full aspect-square">
                {/* Central node */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-accent rounded-full flex items-center justify-center shadow-2xl shadow-accent/30">
                  <Users size={48} className="text-white" />
                </div>

                {/* Orbiting nodes */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const angle = (i * 360) / 5;
                  const radius = 180;
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;

                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                      className="absolute top-1/2 left-1/2 w-20 h-20 bg-white border-4 border-accent/30 rounded-full flex items-center justify-center shadow-xl"
                      style={{
                        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                      }}
                    >
                      <User size={24} className="text-accent" />
                    </motion.div>
                  );
                })}

                {/* Connection lines */}
                <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 400 400">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const angle = (i * 360) / 5;
                    const radius = 180;
                    const x = 200 + Math.cos((angle * Math.PI) / 180) * radius;
                    const y = 200 + Math.sin((angle * Math.PI) / 180) * radius;

                    return (
                      <motion.line
                        key={i}
                        x1="200"
                        y1="200"
                        x2={x}
                        y2={y}
                        stroke="#2563EB"
                        strokeWidth="2"
                        strokeOpacity="0.2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                      />
                    );
                  })}
                </svg>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-8 bg-secondary">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 text-primary">Comment ça marche ?</h2>
            <p className="text-lg text-muted-foreground">En 3 étapes simples</p>
          </motion.div>

          <div className="grid grid-cols-3 gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent/20">
                    <Icon size={36} className="text-white" />
                  </div>
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full font-bold mb-3">
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-20 px-8 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 text-primary">Que souhaitez-vous faire ?</h2>
            <p className="text-lg text-muted-foreground">Trouvez la solution adaptée à vos besoins</p>
          </motion.div>

          <div className="grid grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className={`bg-card rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all cursor-pointer border-2 ${
                  index === 2 ? 'border-amber-500/30' : 'border-border'
                }`}
              >
                <div className="text-5xl mb-4">{useCase.icon}</div>
                <h3 className="text-xl font-bold mb-3">{useCase.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-20 px-8 bg-secondary">
        <div className="max-w-[1400px] mx-auto">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-4 gap-8 mb-16"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl font-bold text-accent mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Testimonials */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 text-primary">Ils nous font confiance</h2>
          </motion.div>

          <div className="grid grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-md"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-muted-foreground italic leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* M&A TEASER */}
      <section className="py-20 px-8 bg-primary text-primary-foreground">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <TrendingUp size={40} className="text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-4">Vous souhaitez céder ou acquérir une entreprise ?</h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Accédez à notre marketplace M&A en accès one-shot à 149€
            </p>
            <Link to="/ma">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-4 bg-amber-500 text-white rounded-lg font-bold shadow-2xl hover:bg-amber-600 transition-colors"
              >
                Découvrir le M&A
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="py-20 px-8 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 text-primary">Tarifs simples et transparents</h2>
            <p className="text-lg text-muted-foreground">Choisissez la formule qui vous convient</p>
          </motion.div>

          <div className="grid grid-cols-3 gap-8 mb-12">
            {pricingPreview.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`bg-card rounded-2xl p-8 border-2 shadow-md text-center ${
                  plan.popular ? 'border-accent scale-105' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <div className="inline-block px-4 py-1 bg-accent text-white rounded-full text-sm font-semibold mb-4">
                    Populaire
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                <div className="text-4xl font-bold text-accent mb-6">{plan.price}</div>
                <Link to="/tarifs">
                  <button className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-accent text-white hover:bg-accent/90'
                      : 'border-2 border-border hover:border-accent'
                  }`}>
                    En savoir plus
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/tarifs">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 text-accent font-semibold hover:underline"
              >
                Voir tous les tarifs →
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
