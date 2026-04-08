import { LayoutDashboard, Home, PlusCircle, Settings, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';

export const Sidebar = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <aside className="w-20 bg-[#A855F7] dark:bg-slate-900 border-r border-transparent dark:border-slate-800 flex flex-col items-center py-8 gap-8 text-white shrink-0 h-screen transition-all duration-300">
      <div className="p-2 bg-white/20 rounded-xl"><LayoutDashboard size={28} /></div>

      <nav className="flex flex-col gap-6 mt-10">
        <Link to="/" title={t('sidebar.dashboard')} className="hover:scale-110 transition-transform">
          <Home size={24} />
        </Link>
        <Link to="/scan" title={t('sidebar.scanner')} className="hover:scale-110 transition-transform opacity-70 hover:opacity-100">
          <PlusCircle size={24} />
        </Link>
      </nav>

      <div className="mt-auto flex flex-col gap-6 items-center">
        <LanguageSelector />
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? t('sidebar.toggle_dark') : t('sidebar.toggle_light')}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <Link to="/settings" title={t('settings.title')} className="hover:scale-110 transition-transform opacity-70 hover:opacity-100 pb-4">
          <Settings size={24} />
        </Link>
      </div>
    </aside>
  );
};