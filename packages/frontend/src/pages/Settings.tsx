import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Key, Save, CheckCircle, Loader2, Settings as SettingsIcon, User, Zap, Info, ArrowLeft } from 'lucide-react';

declare global {
  interface Window {
    require: (module: string) => any;
  }
}

export default function Settings() {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    TUYA_API_KEY: '',
    TUYA_API_SECRET: '',
    TUYA_API_REGION: 'eu'
  });
  const [isDefault, setIsDefault] = useState(false);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showTerms, setShowTerms] = useState(false);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const electron = window.require('electron');
      const savedConfig = await electron.ipcRenderer.invoke('get-tuya-config');
      if (savedConfig) {
        setConfig({
          TUYA_API_KEY: savedConfig.TUYA_API_KEY || '',
          TUYA_API_SECRET: savedConfig.TUYA_API_SECRET || '',
          TUYA_API_REGION: savedConfig.TUYA_API_REGION || 'eu'
        });
        setIsDefault(!!savedConfig.isDefault);
        setIsAdvanced(!savedConfig.isDefault);
        
        // Sincronizar con el backend
        fetch('http://localhost:3000/devices/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedConfig)
        }).catch(console.error);
      }
    } catch (e) {
      console.warn('No Electron IPC found', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus('idle');

    try {
      const electron = window.require('electron');
      const success = await electron.ipcRenderer.invoke('save-tuya-config', config);
      
      const res = await fetch('http://localhost:3000/devices/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (success && res.ok) {
        setStatus('success');
        setIsDefault(false);
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error('Error saving config:', e);
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const switchToSimple = async () => {
    setIsSaving(true);
    try {
      const electron = window.require('electron');
      await electron.ipcRenderer.invoke('reset-tuya-config');
      await loadConfig();
      setShowTerms(false);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-purple-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-4">
          <SettingsIcon className="text-purple-600" size={40} />
          {t('settings.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">{t('settings.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Selector de Modo */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2">
            {t('settings.mode_title')}
          </h3>
          
          {/* Simple Mode Tool */}
          <button 
            onClick={() => {
                if (isAdvanced) setShowTerms(true);
            }}
            disabled={isDefault && !isAdvanced}
            className={`w-full text-left p-6 rounded-3xl border transition-all duration-300 ${!isAdvanced ? 'bg-purple-600 border-transparent shadow-xl shadow-purple-500/20 text-white' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700'}`}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className={`p-3 rounded-2xl ${!isAdvanced ? 'bg-white/20' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'}`}>
                <Zap size={24} />
              </div>
              <span className="font-bold text-lg">{t('settings.mode_simple')}</span>
            </div>
            <p className={`text-sm leading-relaxed ${!isAdvanced ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
              {t('settings.mode_simple_desc')}
            </p>
          </button>

          {/* Advanced Mode Tool */}
          <button 
            onClick={() => setIsAdvanced(true)}
            className={`w-full text-left p-6 rounded-3xl border transition-all duration-300 ${isAdvanced ? 'bg-blue-600 border-transparent shadow-xl shadow-blue-500/20 text-white' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'}`}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className={`p-3 rounded-2xl ${isAdvanced ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                <User size={24} />
              </div>
              <span className="font-bold text-lg">{t('settings.mode_advanced')}</span>
            </div>
            <p className={`text-sm leading-relaxed ${isAdvanced ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
              {t('settings.mode_advanced_desc')}
            </p>
          </button>
        </div>

        {/* Panel de Configuración */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {isDefault && !isAdvanced ? (
            <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col items-center text-center justify-center min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-6">
                <Shield size={40} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">{t('settings.using_defaults')}</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8 font-medium">
                {t('settings.security_notice')}
              </p>
              
              <button 
                onClick={() => setIsAdvanced(true)}
                className="flex items-center gap-2 px-8 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold transition-all transition-colors"
              >
                <Key size={18} />
                {t('settings.switch_advanced')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveCustom} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
              <div className="flex items-center justify-between mb-2">
                <button 
                  type="button"
                  onClick={isDefault ? () => setIsAdvanced(false) : switchToSimple}
                  className="text-xs font-black text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"
                >
                  <ArrowLeft size={14} /> {t('settings.switch_simple')}
                </button>
                <span className="text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">{t('settings.mode_advanced')}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
                    {t('settings.client_id')}
                  </label>
                  <input
                    type="text"
                    value={config.TUYA_API_KEY}
                    onChange={e => setConfig({ ...config, TUYA_API_KEY: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-slate-700 dark:text-slate-200 font-mono text-sm transition-all"
                    placeholder="3qyjwvv..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
                    {t('settings.region')}
                  </label>
                  <select
                    value={config.TUYA_API_REGION}
                    onChange={e => setConfig({ ...config, TUYA_API_REGION: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all appearance-none cursor-pointer"
                  >
                    <option value="eu">Europe (eu)</option>
                    <option value="us">America (us)</option>
                    <option value="cn">China (cn)</option>
                    <option value="in">India (in)</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
                    {t('settings.client_secret')}
                  </label>
                  <input
                    type="password"
                    value={config.TUYA_API_SECRET}
                    onChange={e => setConfig({ ...config, TUYA_API_SECRET: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 text-slate-700 dark:text-slate-200 font-mono text-sm transition-all"
                    placeholder="••••••••••••••••"
                    required
                  />
                </div>
              </div>

              <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-50 dark:border-slate-800">
                <div className="flex items-center gap-3 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 px-4 py-2 rounded-2xl border border-cyan-100 dark:border-cyan-900/30">
                  <Info size={18} />
                  <p className="text-[10px] font-bold leading-tight max-w-[250px]">
                    {t('settings.keys_notice')}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg hover:-translate-y-1 active:scale-95 ${
                    status === 'success' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {isSaving ? '...' : status === 'success' ? t('settings.saved') : t('settings.save_keys')}
                </button>
              </div>
            </form>
          )}

          {status === 'success' && (
            <div className="animate-in slide-in-from-top duration-300 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-2xl flex items-center gap-3 text-green-700 dark:text-green-400 font-semibold shadow-sm">
              <CheckCircle size={20} />
              {t('settings.save_success')}
            </div>
          )}

          {/* Sección de Información Legal */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter leading-none">{t('settings.legal_info')}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{t('settings.transparency_privacy')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500">{t('settings.legal_notice')}</h4>
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2 leading-relaxed">
                  <p>{t('settings.legal_text')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500">{t('settings.privacy_title')}</h4>
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2 leading-relaxed">
                  <p>{t('settings.privacy_text')}</p>
                </div>
              </div>

              <div className="md:col-span-2 pt-4 border-t border-gray-50 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">{t('settings.attributions')}</h4>
                <div className="flex flex-wrap gap-2">
                  {['React', 'Electron', 'Node.js', 'MongoDB', 'Tuya SDK', 'Lucide Icons', 'Fastify', 'Framer Motion'].map((lib) => (
                    <span key={lib} className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                      {lib}
                    </span>
                  ))}
                </div>
                <p className="text-[9px] text-gray-400 mt-4 font-medium italic">
                  {t('settings.copyright')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Términos */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-lg shadow-2xl border border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-3xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6">
                <Zap size={32} className="text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-4">{t('settings.terms_title')}</h2>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
                {t('settings.terms_text')}
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={switchToSimple}
                  className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-purple-500/20"
                >
                  {t('settings.accept_terms')}
                </button>
                <button 
                  onClick={() => setShowTerms(false)}
                  className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {t('settings.cancel')}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
