import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Botón Principal (Compacto para Sidebar) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center group relative border border-transparent hover:border-white/10"
        title="Cambiar idioma / Change language"
      >
        <Languages size={20} className="text-white group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 bg-cyan-500 text-[8px] font-black px-1 rounded-sm uppercase">
          {i18n.language.substring(0, 2)}
        </span>
      </button>

      {/* Menú Desplegable (Creciendo hacia arriba ya que suele estar al final de la sidebar) */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-3 w-40 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-[100]">
          <div className="p-2 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 flex items-center gap-2">
              <Languages size={10} /> Idioma / Language
            </p>
          </div>
          <div className="py-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-between
                  ${i18n.language === lang.code 
                    ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
              >
                {lang.name}
                {i18n.language === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />}
              </button>
            ))}
          </div>
          
          {/* Triángulo indicador opcional */}
          <div className="absolute -bottom-1 left-4 w-2 h-2 bg-white dark:bg-slate-900 border-r border-b border-gray-100 dark:border-slate-800 rotate-45" />
        </div>
      )}
    </div>
  );
}
