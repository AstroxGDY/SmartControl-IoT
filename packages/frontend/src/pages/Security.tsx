import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, CheckCircle, Info, RefreshCw, ExternalLink, ChevronRight, ChevronDown, Lock, Unlock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://localhost:3000';

interface CVE {
  id: string;
  cvss_score: number | string;
  severidad: string;
  descripcion: string;
  consejos: string[];
  enlaces: { tipo: string; url: string }[];
}

interface SecurityData {
  estado: string;
  total_vulnerabilidades: number;
  cves: CVE[];
  query: string;
}

interface Device {
  _id: string;
  name: string;
  type: string;
  image: string;
  attributes: {
    security?: SecurityData;
    lastSecurityScan?: string;
    manufacturer?: string;
    model?: string;
  };
}

export default function Security() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/devices`);
      const data = await res.json();
      setDevices(data);
    } catch (err) {
      console.error("Fallo al cargar dispositivos", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (id: string) => {
    setScanningId(id);
    try {
      const res = await fetch(`${API_URL}/devices/${id}/security-scan`);
      const result = await res.json();
      
      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        setDevices(prev => prev.map(d => d._id === id ? { 
          ...d, 
          attributes: { ...d.attributes, security: result, lastSecurityScan: new Date().toISOString() } 
        } : d));
      }
    } catch (err) {
      console.error("Fallo en el escaneo", err);
    } finally {
      setScanningId(null);
    }
  };

  const getSeverityColor = (score: number | string) => {
    const num = typeof score === 'number' ? score : parseFloat(score);
    if (isNaN(num)) return 'text-slate-400 bg-slate-400/10';
    if (num >= 9.0) return 'text-red-600 bg-red-600/10 border-red-600/20';
    if (num >= 7.0) return 'text-orange-600 bg-orange-600/10 border-orange-600/20';
    if (num >= 4.0) return 'text-yellow-600 bg-yellow-600/10 border-yellow-600/20';
    return 'text-emerald-600 bg-emerald-600/10 border-emerald-600/20';
  };

  const stats = {
    total: devices.length,
    vulnerable: devices.filter(d => (d.attributes.security?.total_vulnerabilidades || 0) > 0).length,
    critical: devices.filter(d => d.attributes.security?.cves.some(c => {
        const s = typeof c.cvss_score === 'number' ? c.cvss_score : parseFloat(c.cvss_score);
        return s >= 7.0;
    })).length
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-8 max-w-7xl mx-auto space-y-12"
    >
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
        <motion.div variants={itemVariants}>
          <h1 className="text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">
            {t('security.title')}
          </h1>
          <p className="text-slate-400 mt-3 font-bold uppercase text-xs tracking-widest">
            {t('security.subtitle')}
          </p>
        </motion.div>
        <motion.div variants={itemVariants} className="flex gap-4">
          <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <Shield className="text-indigo-500" size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{stats.vulnerable} / {stats.total} {t('security.vulnerable')}</span>
          </div>
        </motion.div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[3rem] text-white shadow-2xl shadow-indigo-500/20 group relative overflow-hidden"
        >
           <Shield size={160} className="absolute -right-12 -top-12 opacity-10 group-hover:scale-110 transition-transform duration-700" />
           <div className="relative z-10">
              <div className="text-6xl font-black mb-2">{stats.total}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-100 opacity-80">{t('security.total_protected')}</div>
           </div>
        </motion.div>
        
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm group transition-colors"
        >
           <AlertTriangle size={32} className="mb-6 text-orange-500 group-hover:scale-110 transition-transform" />
           <div className="text-5xl font-black text-slate-800 dark:text-white mb-2">{stats.vulnerable}</div>
           <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('security.detected_vulns')}</div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm group transition-colors"
        >
           <Zap size={32} className="mb-6 text-red-500 group-hover:scale-110 transition-transform" />
           <div className="text-5xl font-black text-slate-800 dark:text-white mb-2">{stats.critical}</div>
           <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('security.critical_risks')}</div>
        </motion.div>
      </div>

      {/* Device List */}
      <div className="space-y-8">
        <motion.h2 variants={itemVariants} className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
          <Lock size={28} className="text-slate-400" />
          {t('security.scan_device')}
        </motion.h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <RefreshCw className="animate-spin text-indigo-500" size={56} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">{t('security.analyzing_history')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {devices.map(device => {
                const security = device.attributes.security;
                const isVulnerable = (security?.total_vulnerabilidades || 0) > 0;
                const isExpanded = expandedId === device._id;

                return (
                  <motion.div 
                    layout
                    key={device._id} 
                    variants={itemVariants}
                    className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${
                      isExpanded ? 'ring-4 ring-indigo-500/10 border-indigo-500/30' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          <img src={device.image} alt="" className="w-12 h-12 object-contain" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{device.name}</h3>
                          <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-2 uppercase tracking-[0.2em] font-black">
                            <span className="text-indigo-500">{device.attributes.manufacturer || t('common.generic')}</span>
                            <span>•</span>
                            <span>{device.type}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        {security ? (
                          <div className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                            isVulnerable ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30' 
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                          }`}>
                            {isVulnerable ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                            {isVulnerable ? t('security.vulnerabilities_count', { count: security.total_vulnerabilidades }) : t('security.safe')}
                          </div>
                        ) : (
                          <div className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                            {t('security.unexpanded')}
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleScan(device._id)}
                            disabled={scanningId === device._id}
                            className="p-4 bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500 rounded-2xl hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all disabled:opacity-50 shadow-sm"
                            title={t('security.reanalyze')}
                          >
                            <RefreshCw size={20} className={scanningId === device._id ? "animate-spin" : ""} />
                          </button>
                          {security && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : device._id)}
                              className={`p-4 rounded-2xl transition-all shadow-sm ${isExpanded ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'}`}
                            >
                              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && security && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-8 pb-10 border-t border-slate-50 dark:border-slate-800 pt-10"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* CVEs */}
                            <div className="space-y-6">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                <Zap size={16} className="text-indigo-500" /> {t('security.nist_history')}
                              </h4>
                              {security.cves.length === 0 ? (
                                <div className="p-10 bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">
                                   {t('security.no_vulns')}
                                </div>
                              ) : (
                                <div className="space-y-6">
                                  {security.cves.map(cve => (
                                    <div key={cve.id} className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all">
                                      <div className="flex items-center justify-between mb-4">
                                        <span className="font-black text-indigo-500 text-base">{cve.id}</span>
                                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getSeverityColor(cve.cvss_score)}`}>
                                          CVSS {cve.cvss_score} • {cve.severidad}
                                        </div>
                                      </div>
                                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed font-medium">
                                        {cve.descripcion}
                                      </p>
                                      <div className="flex flex-wrap gap-3">
                                        {cve.enlaces.map((link, idx) => (
                                          <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 border border-slate-100 dark:border-slate-800 transition-all shadow-sm">
                                            <ExternalLink size={14} />
                                            {link.tipo.split(',')[0]}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Tips */}
                            <div className="space-y-6">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                <Info size={16} className="text-indigo-500" /> {t('security.mitigation_tips')}
                              </h4>
                              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-8 rounded-[3rem] border border-indigo-100 dark:border-indigo-900/30 space-y-6 shadow-sm">
                                 {Array.from(new Set(security.cves.flatMap(c => c.consejos))).map((tip, idx) => (
                                   <div key={idx} className="flex gap-5 group">
                                     <div className="shrink-0 w-8 h-8 rounded-2xl bg-indigo-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
                                       <CheckCircle size={16} />
                                     </div>
                                     <p className="text-sm font-black text-indigo-900 dark:text-indigo-200 leading-snug">
                                       {tip}
                                     </p>
                                   </div>
                                 ))}
                                 {security.cves.length === 0 && (
                                   <div className="flex gap-5">
                                      <div className="shrink-0 w-8 h-8 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                        <CheckCircle size={16} />
                                      </div>
                                      <p className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                                        {t('security.no_actions')}
                                      </p>
                                   </div>
                                 )}
                              </div>
                              
                              <div className="p-6 bg-amber-50/50 dark:bg-amber-950/20 rounded-[2rem] border border-amber-100 dark:border-amber-900/30 flex items-start gap-4">
                                 <Unlock size={24} className="text-amber-500 mt-1 shrink-0" />
                                 <p className="text-xs text-amber-700 dark:text-amber-300 font-bold leading-relaxed uppercase tracking-tight">
                                   {t('security.reminder')}
                                 </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
