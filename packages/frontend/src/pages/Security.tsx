import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, CheckCircle, Info, RefreshCw, ExternalLink, ChevronRight, ChevronDown, Lock, Unlock, Zap } from 'lucide-react';

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
        // Actualizar el estado local
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            {t('security.title')}
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            {t('security.subtitle')}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Shield className="text-indigo-500" size={20} />
            <span className="text-sm font-bold">{stats.vulnerable} / {stats.total} {t('security.vulnerable')}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-500/20 group hover:scale-[1.02] transition-transform cursor-default">
           <Shield size={32} className="mb-4 opacity-80" />
           <div className="text-4xl font-black">{stats.total}</div>
           <div className="text-indigo-100 font-medium">{t('security.total_protected')}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-orange-500/50 transition-colors">
           <AlertTriangle size={32} className="mb-4 text-orange-500" />
           <div className="text-4xl font-black text-slate-900 dark:text-white">{stats.vulnerable}</div>
           <div className="text-slate-500 font-medium">{t('security.detected_vulns')}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-red-500/50 transition-colors">
           <Zap size={32} className="mb-4 text-red-500" />
           <div className="text-4xl font-black text-slate-900 dark:text-white">{stats.critical}</div>
           <div className="text-slate-500 font-medium">{t('security.critical_risks')}</div>
        </div>
      </div>

      {/* Device List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Lock size={24} className="text-slate-400" />
          {t('security.scan_device')}
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="animate-spin text-indigo-500" size={48} />
            <p className="text-slate-500 font-medium animate-pulse">{t('security.analyzing_history')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {devices.map(device => {
              const security = device.attributes.security;
              const isVulnerable = (security?.total_vulnerabilidades || 0) > 0;
              const isExpanded = expandedId === device._id;

              return (
                <div key={device._id} className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all overflow-hidden ${
                  isExpanded ? 'ring-2 ring-indigo-500/20 border-indigo-500/30' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}>
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={device.image} alt={device.name} className="w-10 h-10 object-contain opacity-80" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{device.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">
                          <span>{device.attributes.manufacturer || t('common.generic')}</span>
                          <span>•</span>
                          <span>{device.type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {security ? (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${
                          isVulnerable ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30' 
                                      : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                        }`}>
                          {isVulnerable ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                          {isVulnerable ? t('security.vulnerabilities_count', { count: security.total_vulnerabilidades }) : t('security.safe')}
                        </div>
                      ) : (
                        <div className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-50 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                          {t('security.unexpanded')}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleScan(device._id)}
                          disabled={scanningId === device._id}
                          className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50 shadow-sm"
                          title={t('security.reanalyze')}
                        >
                          <RefreshCw size={20} className={scanningId === device._id ? "animate-spin" : ""} />
                        </button>
                        {security && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : device._id)}
                            className={`p-3 rounded-xl transition-all ${isExpanded ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'}`}
                          >
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && security && (
                    <div className="px-6 pb-8 border-t border-slate-100 dark:border-slate-800 pt-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* CVEs */}
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-500 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Zap size={14} /> {t('security.nist_history')}
                          </h4>
                          {security.cves.length === 0 ? (
                            <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 italic">
                               {t('security.no_vulns')}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {security.cves.map(cve => (
                                <div key={cve.id} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="font-black text-indigo-500">{cve.id}</span>
                                    <div className={`px-3 py-1 rounded-lg text-xs font-black border ${getSeverityColor(cve.cvss_score)}`}>
                                      CVSS {cve.cvss_score} • {cve.severidad}
                                    </div>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 leading-relaxed">
                                    {cve.descripcion}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {cve.enlaces.map((link, idx) => (
                                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-500 border border-slate-200 dark:border-slate-800 transition-all">
                                        <ExternalLink size={12} />
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
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-500 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Info size={14} /> {t('security.mitigation_tips')}
                          </h4>
                          <div className="bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                             {/* Generamos una lista única de consejos de todos los CVEs */}
                             {Array.from(new Set(security.cves.flatMap(c => c.consejos))).map((tip, idx) => (
                               <div key={idx} className="flex gap-4 group">
                                 <div className="mt-1 shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                                   <CheckCircle size={14} />
                                 </div>
                                 <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                                   {tip}
                                 </p>
                               </div>
                             ))}
                             {security.cves.length === 0 && (
                               <div className="flex gap-4">
                                  <div className="mt-1 shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                    <CheckCircle size={14} />
                                  </div>
                                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                                    {t('security.no_actions')}
                                  </p>
                               </div>
                             )}
                          </div>
                          
                          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                             <Unlock size={18} className="text-amber-500 mt-1 shrink-0" />
                             <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                               {t('security.reminder')}
                             </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
