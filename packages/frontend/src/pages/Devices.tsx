import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { DeviceCard } from '../components/DeviceCard';
import { Search, LayoutGrid, ListFilter, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IDevice } from '../../../shared/types';

export default function Devices() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<IDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDevices = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetch('http://localhost:3000/devices')
      .then(res => res.json())
      .then(data => {
        setDevices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const filteredDevices = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase().trim();
    if (!lowerSearch) return devices;
    
    return devices.filter(d => 
        d.name.toLowerCase().includes(lowerSearch) ||
        (d._id && d._id.toLowerCase().includes(lowerSearch)) ||
        d.attributes?.tuyaId?.toLowerCase().includes(lowerSearch) ||
        d.type.toLowerCase().includes(lowerSearch) ||
        (d as any).ip?.toLowerCase().includes(lowerSearch)
    );
  }, [devices, searchTerm]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  if (loading) {
    return (
        <div className="p-8 flex flex-col items-center justify-center h-[60vh] text-slate-400">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-12 h-12 border-4 border-indigo-100 dark:border-indigo-900/30 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="font-black uppercase tracking-widest text-[10px] text-indigo-500">{t('common.loading')}</p>
            </motion.div>
        </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-4 sm:p-8 max-w-7xl mx-auto"
    >
      {/* Header & Search Bar */}
      <header className="mb-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.div variants={itemVariants}>
                <h1 className="text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">
                    {t('devices_page.title')}
                </h1>
                <p className="text-slate-400 font-bold mt-3 uppercase text-xs tracking-widest">
                    <Trans i18nKey="devices_page.subtitle" values={{ count: devices.length }}>
                      Controla, configura y audita tus <span className="text-indigo-600 dark:text-indigo-400">{devices.length}</span> dispositivos vinculados
                    </Trans>
                </p>
            </motion.div>
            <motion.div variants={itemVariants} className="flex gap-2">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm">
                    <LayoutGrid size={18} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                      {t('devices_page.total', { count: devices.length })}
                    </span>
                </div>
            </motion.div>
        </div>

        {/* Search Input Container */}
        <motion.div variants={itemVariants} className="relative group max-w-2xl">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search size={20} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
                type="text"
                placeholder={t('devices_page.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-16 pr-14 py-5 bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500/30 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none outline-none text-slate-800 dark:text-white font-black placeholder:text-slate-400 transition-all text-sm uppercase tracking-tight"
            />
            <AnimatePresence>
              {searchTerm && (
                  <motion.button 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-6 flex items-center text-slate-300 hover:text-red-500 transition-colors"
                  >
                      <XCircle size={20} />
                  </motion.button>
              )}
            </AnimatePresence>
        </motion.div>
      </header>

      <AnimatePresence mode="popLayout">
        {filteredDevices.length === 0 ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="py-24 text-center bg-white dark:bg-slate-900 rounded-[3.5rem] border-4 border-dashed border-slate-50 dark:border-slate-800 shadow-sm"
          >
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <ListFilter size={32} className="text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                {t('devices_page.no_results')}
              </h3>
              <p className="text-slate-400 font-bold mt-3 uppercase text-xs tracking-widest">
                <Trans i18nKey="devices_page.no_results_desc" values={{ term: searchTerm }}>
                  No hemos encontrado ningún dispositivo que coincida con "<span className="text-indigo-500 font-bold">{searchTerm}</span>"
                </Trans>
              </p>
              <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-8 px-8 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-xl tracking-widest hover:scale-105 transition-all"
              >
                  {t('devices_page.clear_search')}
              </button>
          </motion.div>
        ) : (
          <motion.div 
            key="grid"
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            {filteredDevices.map((device) => (
              <motion.div
                key={device._id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                variants={itemVariants}
              >
                <DeviceCard
                  device={device}
                  onDeleted={() => fetchDevices(true)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}