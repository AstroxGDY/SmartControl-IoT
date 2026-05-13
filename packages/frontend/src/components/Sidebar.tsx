import { LayoutDashboard, Home, PlusCircle, Settings, Moon, Sun, Bluetooth, Activity, BarChart, Shield, Zap } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import { motion } from 'framer-motion';

export const Sidebar = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { to: '/', icon: Home, title: t('sidebar.dashboard') },
    { to: '/scan', icon: PlusCircle, title: t('sidebar.scanner') },
    { to: '/bluetooth', icon: Bluetooth, title: t('bluetooth.title') },
    { to: '/statistics', icon: BarChart, title: t('statistics.title') },
    { to: '/security', icon: Shield, title: t('security.title') },
    { to: '/rules', icon: Zap, title: t('sidebar.rules') },
  ];

  return (
    <aside className="w-22 bg-[#EEF1F8] dark:bg-slate-950 border-r border-slate-200/60 dark:border-slate-900 flex flex-col items-center py-6 gap-4 shrink-0 h-full transition-all duration-300 z-50">
      <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white mb-2">
        <LayoutDashboard size={24} />
      </div>

      <nav className="flex flex-col gap-4 flex-1 overflow-y-auto no-scrollbar py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link 
              key={item.to} 
              to={item.to} 
              title={item.title} 
              className="relative p-3 rounded-2xl transition-all duration-300 group"
            >
              {isActive && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
                <item.icon 
                  size={24} 
                  className={`relative z-10 transition-colors duration-300 ${
                    isActive 
                      ? 'text-indigo-600 dark:text-indigo-400' 
                      : 'text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200'
                  }`} 
                />
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-600 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4 items-center">
        <LanguageSelector />
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? t('sidebar.toggle_dark') : t('sidebar.toggle_light')}
          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors border border-slate-100 dark:border-slate-800"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <Link 
          to="/settings" 
          title={t('settings.title')} 
          className={`p-3 rounded-2xl transition-all duration-300 relative group ${
            location.pathname === '/settings' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
          }`}
        >
           <Settings 
            size={24} 
            className={`${
              location.pathname === '/settings' 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
            }`} 
          />
        </Link>
      </div>
    </aside>
  );
};