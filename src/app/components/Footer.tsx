import { Link } from 'react-router';
import { Github, Twitter, Linkedin } from 'lucide-react';

export default function Footer() {
  const footerLinks = {
    'Entreprise': [
      { label: 'À propos', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Tarifs', href: '/tarifs' },
    ],
    'Services': [
      { label: 'M&A', href: '/ma' },
      { label: 'Recherche', href: '/recherche' },
      { label: 'Pitch IA', href: '/generateur-pitch' },
    ],
    'Légal': [
      { label: 'CGU', href: '#' },
      { label: 'Confidentialité', href: '#' },
      { label: 'Mentions légales', href: '#' },
    ],
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-[1400px] mx-auto px-8 py-16">
        <div className="grid grid-cols-4 gap-12 mb-12">
          {/* Logo & Description */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">G</span>
              </div>
              <span className="text-2xl font-bold">GoFounders</span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              La plateforme qui connecte entrepreneurs, talents et opportunités business.
            </p>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary-foreground/10 flex items-center justify-between">
          <p className="text-primary-foreground/60 text-sm">
            © 2026 GoFounders. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
            >
              <Twitter size={18} />
            </a>
            <a
              href="#"
              className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
            >
              <Linkedin size={18} />
            </a>
            <a
              href="#"
              className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
            >
              <Github size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
