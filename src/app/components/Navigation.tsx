import { Link, useLocation } from 'react-router';
import { motion } from 'motion/react';

export default function Navigation() {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/tableau-de-bord';
  const isAssistant = location.pathname === '/assistant';

  if (isDashboard || isAssistant) return null;

  const navLinks = [
    { href: '/recherche', label: 'Trouver un associé' },
    { href: '/ma', label: 'M&A' },
    { href: '/tarifs', label: 'Tarifs' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm"
    >
      <div className="max-w-[1400px] mx-auto px-8 h-20 flex items-center justify-between">
        {/* Logo Left */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shadow-md">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <span className="text-2xl font-bold text-primary">
            GoFounders
          </span>
        </Link>

        {/* Nav Links Center */}
        <div className="flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-base font-medium transition-colors relative py-2 ${
                location.pathname === link.href
                  ? 'text-accent'
                  : 'text-foreground/70 hover:text-accent'
              }`}
            >
              {link.label}
              {location.pathname === link.href && (
                <motion.div
                  layoutId="navUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* Auth Buttons Right */}
        <div className="flex items-center gap-3">
          <button className="px-5 py-2 text-foreground font-medium hover:text-accent transition-colors">
            Connexion
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2.5 bg-accent text-white rounded-lg font-semibold shadow-md shadow-accent/25 hover:bg-accent/90 transition-colors"
          >
            S'inscrire
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
}
