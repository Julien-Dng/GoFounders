import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  Home,
  Search,
  Users,
  MessageSquare,
  TrendingUp,
  Sparkles,
  CreditCard,
  Settings,
  Bell,
  Eye,
  Mail,
  Target,
  ChevronRight,
  Crown,
  User,
} from 'lucide-react';

export default function DashboardPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const sidebarItems = [
    { id: 'accueil', label: 'Accueil', icon: Home, path: '/dashboard' },
    { id: 'recherche', label: 'Recherche', icon: Search, path: '/recherche' },
    { id: 'matches', label: 'Mes Matches', icon: Users, path: '/dashboard' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: 3, path: '/dashboard' },
    { id: 'ma', label: 'M&A', icon: TrendingUp, path: '/ma' },
    { id: 'assistant', label: 'Assistant IA', icon: Sparkles, path: '/assistant' },
    { id: 'abonnement', label: 'Abonnement', icon: CreditCard, path: '/tarifs' },
    { id: 'parametres', label: 'Paramètres', icon: Settings, path: '/dashboard' },
  ];

  const matches = [
    {
      name: 'Sophie Bernard',
      role: 'CTO',
      avatar: 'SB',
      stage: 'MVP',
      compatibility: 94,
      project: 'SaaS B2B pour la logistique',
    },
    {
      name: 'Marc Laurent',
      role: 'Développeur Full-Stack',
      avatar: 'ML',
      stage: 'Idée',
      compatibility: 87,
      project: 'Marketplace locale bio',
    },
  ];

  const activities = [
    { text: '3 personnes ont consulté votre profil', time: 'Il y a 2h', type: 'view' },
    { text: 'Nouveau match disponible', time: 'Il y a 5h', type: 'match' },
    { text: 'Sophie B. a répondu à votre message', time: 'Hier', type: 'message' },
    { text: 'Votre profil a été mis en avant', time: 'Il y a 2j', type: 'boost' },
  ];

  const stats = [
    { label: 'Vues profil', value: '127', icon: Eye },
    { label: 'Messages reçus', value: '18', icon: Mail },
    { label: 'Matches', value: '24', icon: Target },
  ];

  const quickActions = [
    { label: 'Analyser mes matches', icon: Target },
    { label: 'Améliorer mon profil', icon: User },
    { label: 'Comprendre mes statistiques', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-secondary flex">
      {/* LEFT SIDEBAR */}
      <aside className="w-60 bg-primary text-primary-foreground fixed left-0 top-0 bottom-0 flex flex-col border-r border-primary-foreground/10">
        {/* Logo */}
        <div className="p-6 border-b border-primary-foreground/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <span className="text-xl font-bold">GoFounders</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-all relative group"
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-primary-foreground/10">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              MJ
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">Marc Julien</div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2 py-0.5 bg-muted/20 text-muted rounded">FREE</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="ml-60 flex-1 flex flex-col">
        {/* TOP BAR */}
        <header className="bg-white border-b border-border sticky top-0 z-40">
          <div className="px-8 h-16 flex items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher des profils, compétences..."
                  className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg border border-transparent focus:border-accent outline-none transition-colors"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
                <Bell size={20} className="text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
              </button>
              <div className="w-9 h-9 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold cursor-pointer">
                MJ
              </div>
            </div>
          </div>
        </header>

        {/* 3 COLUMN LAYOUT */}
        <div className="p-8">
          <div className="grid grid-cols-12 gap-6">
            {/* LEFT COLUMN */}
            <div className="col-span-3 space-y-6">
              {/* Profile Completion Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl border border-border p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold mb-4">Mon profil</h3>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Complétion</span>
                    <span className="text-sm font-bold text-accent">65%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Complétez votre profil pour augmenter vos chances de match
                </p>
                <button className="w-full py-2 border-2 border-border rounded-lg text-sm font-semibold hover:border-accent transition-colors">
                  Compléter mon profil
                </button>
              </motion.div>

              {/* PRO Upsell Banner */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gradient-to-br from-accent to-primary rounded-2xl p-6 text-white shadow-lg"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                  <Crown size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">Passez en PRO</h3>
                <p className="text-sm opacity-90 mb-4 leading-relaxed">
                  Débloquez l'IA matching, les messages illimités et bien plus
                </p>
                <button className="w-full py-2.5 bg-white text-accent rounded-lg font-semibold hover:bg-white/95 transition-colors shadow-md">
                  Découvrir PRO
                </button>
              </motion.div>
            </div>

            {/* CENTER COLUMN */}
            <div className="col-span-6 space-y-6">
              {/* Matches du jour */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-2xl border border-border p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-accent" />
                    <h2 className="text-xl font-bold">Vos matches du jour</h2>
                  </div>
                  <button className="text-sm text-accent font-semibold hover:underline">
                    Voir tous
                  </button>
                </div>

                <div className="space-y-4">
                  {matches.map((match, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                      className="flex items-center gap-4 p-4 bg-secondary rounded-xl hover:bg-accent/5 transition-colors border border-transparent hover:border-accent/20 group"
                    >
                      <div className="w-14 h-14 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {match.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{match.name}</h3>
                          <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded font-semibold">
                            {match.stage}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">{match.role}</div>
                        <div className="text-sm text-foreground/70 truncate">{match.project}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent rounded-full">
                          <Sparkles size={14} />
                          <span className="text-sm font-bold">{match.compatibility}%</span>
                        </div>
                        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/90">
                          Voir le profil
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Activité récente */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-2xl border border-border p-6 shadow-sm"
              >
                <h2 className="text-xl font-bold mb-6">Activité récente</h2>
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                    >
                      <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{activity.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground mt-1" />
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="col-span-3 space-y-6">
              {/* AI Assistant Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl border-2 border-accent/20 p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">Assistant IA</h3>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 mb-4">
                  Bonjour Marc 👋<br />Que puis-je faire pour vous ?
                </p>
                <div className="space-y-2">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={index}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-accent/5 border border-border hover:border-accent/30 rounded-lg text-sm font-medium transition-all text-left group"
                      >
                        <Icon size={16} className="text-accent" />
                        <span className="flex-1">{action.label}</span>
                        <ChevronRight size={14} className="text-muted-foreground group-hover:text-accent" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Statistiques */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white rounded-2xl border border-border p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold mb-4">Statistiques</h3>
                <div className="space-y-4">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className="text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{stat.label}</span>
                        </div>
                        <span className="text-lg font-bold text-accent">{stat.value}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING CHAT BUBBLE */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.8, type: 'spring' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-accent rounded-full shadow-2xl shadow-accent/30 flex items-center justify-center text-white hover:bg-accent/90 transition-colors z-50"
      >
        <MessageSquare size={24} />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center font-bold">
          3
        </span>
      </motion.button>
    </div>
  );
}
