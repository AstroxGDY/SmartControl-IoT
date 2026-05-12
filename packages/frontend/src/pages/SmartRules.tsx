import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Play, Trash2, Plus, AlertCircle, Loader2, CheckCircle2, X, Settings2, Clock, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { getCapabilitiesForCategory, DeviceDP } from '../utils/deviceCapabilities';

interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  type: 'scene' | 'automation';
  status: string;
}

interface DeviceOption {
  _id: string;
  name: string;
  type: string; // Tuya category
  attributes?: {
    tuyaId?: string;
  };
}

const SmartRules = () => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<Rule[]>([]);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleType, setRuleType] = useState<'scene' | 'automation'>('scene');
  const [triggerType, setTriggerType] = useState<'device' | 'timer'>('device');
  const [newRuleName, setNewRuleName] = useState('');
  
  // Timer Trigger State
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [scheduledDays, setScheduledDays] = useState<boolean[]>([true, true, true, true, true, true, true]); // L-D

  // Device Action State
  const [selectedDevice, setSelectedDevice] = useState('');
  const [actionDPValues, setActionDPValues] = useState<Record<string, any>>({ "1": true });
  
  // Device Condition State (for automation)
  const [conditionDevice, setConditionDevice] = useState('');
  const [conditionDPValues, setConditionDPValues] = useState<Record<string, any>>({ "1": true });

  const [isCreating, setIsCreating] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/rules');
      const data = await response.json();
      if (data.success && Array.isArray(data.result)) {
        setRules(data.result.map((r: any) => ({
            id: r.id || r.rule_id,
            name: r.name,
            enabled: r.enabled ?? true,
            type: r.scene_id || r.scene_type === 1 ? 'scene' : 'automation',
            status: r.status || 'active'
        })));
      } else {
        setRules([]);
      }
    } catch (err) {
      console.error('Error fetching rules:', err);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch('http://localhost:3000/devices');
      const data = await response.json();
      if (Array.isArray(data)) {
        setDevices(data.filter(d => d.attributes?.tuyaId));
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchDevices();
  }, []);

  const handleTrigger = async (id: string) => {
    setExecuting(id);
    try {
      const response = await fetch(`http://localhost:3000/rules/${id}/trigger`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSuccessMsg(t('rules.execute_success'));
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(t('rules.execute_error'));
      }
    } catch (err) {
      setError(t('rules.execute_error'));
    } finally {
      setExecuting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('rules.delete_confirm'))) return;
    try {
      const response = await fetch(`http://localhost:3000/rules/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setRules(rules.filter(r => r.id !== id));
        setSuccessMsg(t('rules.delete_success'));
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setError(t('rules.delete_error'));
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName) return;

    setIsCreating(true);
    setError(null);

    const actionDev = devices.find(d => d._id === selectedDevice);
    if (!actionDev?.attributes?.tuyaId) {
        setError("Selecciona un dispositivo para la acción");
        setIsCreating(false);
        return;
    }

    const ruleBody: any = {
      name: newRuleName,
      background: "https://images.tuyaeu.com/smart/scene/unsort/1.png",
      match_type: 1, 
      actions: [
        {
          entity_id: actionDev.attributes.tuyaId,
          action_executor: "device_issue",
          action_parameter: actionDPValues
        }
      ]
    };

    if (ruleType === 'automation') {
        if (triggerType === 'device') {
            const condDev = devices.find(d => d._id === conditionDevice);
            if (condDev?.attributes?.tuyaId) {
                ruleBody.conditions = Object.keys(conditionDPValues).map((dpCode, index) => ({
                    entity_id: condDev.attributes.tuyaId,
                    entity_type: "device",
                    order_num: index + 1,
                    trigger_and_condition: "trigger",
                    sub_conditions: {
                        code: dpCode,
                        value: conditionDPValues[dpCode],
                        operator: "="
                    }
                }));
            }
        } else if (triggerType === 'timer') {
            const loops = scheduledDays.map(d => d ? "1" : "0").join("");
            ruleBody.conditions = [
                {
                    entity_type: "timer",
                    order_num: 1,
                    trigger_and_condition: "trigger",
                    sub_conditions: {
                        time: scheduledTime,
                        loops: loops,
                        timezone_id: "Europe/Madrid"
                    }
                }
            ];
        }
    }

    try {
      const response = await fetch('http://localhost:3000/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleBody)
      });
      
      const data = await response.json();
      if (data.success) {
        setIsModalOpen(false);
        setNewRuleName('');
        setSelectedDevice('');
        setConditionDevice('');
        fetchRules();
        setSuccessMsg(t('rules.execute_success'));
      } else {
        setError(data.msg || t('rules.rule_creation_error'));
      }
    } catch (err) {
      setError(t('rules.connection_error'));
    } finally {
      setIsCreating(false);
    }
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
      className="p-8 max-w-7xl mx-auto min-h-screen"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <motion.div variants={itemVariants}>
          <h1 className="text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none flex items-center gap-4">
            <Zap className="text-indigo-600 dark:text-indigo-400" size={48} />
            {t('rules.title')}
          </h1>
          <p className="text-slate-400 mt-3 font-bold uppercase text-xs tracking-widest leading-relaxed">
            {t('rules.subtitle')}
          </p>
        </motion.div>
        
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 transition-all"
        >
          <Plus size={18} />
          {t('rules.new_rule')}
        </motion.button>
      </header>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 flex items-center gap-4 shadow-sm overflow-hidden"
          >
            <AlertCircle size={22} />
            <div className="flex-1 font-black uppercase text-[10px] tracking-wider">{error}</div>
            <button onClick={() => setError(null)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-xl transition-colors">
              <X size={18} />
            </button>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 flex items-center gap-4 shadow-sm overflow-hidden"
          >
            <CheckCircle2 size={22} />
            <div className="font-black uppercase text-[10px] tracking-wider">{successMsg}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="animate-spin text-indigo-500 mb-6" size={56} />
          <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
            {t('rules.syncing')}
          </p>
        </div>
      ) : rules.length === 0 ? (
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-slate-900/50 border-4 border-dashed border-slate-50 dark:border-slate-800 rounded-[3.5rem] p-24 text-center"
        >
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Zap className="text-slate-300" size={48} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-4">
            {t('rules.no_rules')}
          </h2>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest max-w-md mx-auto mb-10 leading-relaxed">
            {t('rules.create_desc')}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rules.map((rule) => (
            <motion.div
              layout
              key={rule.id}
              variants={itemVariants}
              className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
              
              <div className="flex justify-between items-start mb-8">
                <div className={`p-4 rounded-2xl shadow-sm ${rule.type === 'scene' ? 'bg-amber-50 text-amber-500 dark:bg-amber-900/20' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'}`}>
                  <Zap size={28} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleTrigger(rule.id)}
                    disabled={executing === rule.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all disabled:opacity-50 shadow-sm"
                    title={t('rules.trigger')}
                  >
                    {executing === rule.id ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                  </button>
                  <button 
                    onClick={() => handleDelete(rule.id)}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-all shadow-sm"
                    title={t('rules.delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3 uppercase tracking-tight line-clamp-1">
                {rule.name}
              </h3>
              
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                <span className={`px-3 py-1 rounded-lg ${rule.enabled ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'}`}>
                  {rule.enabled ? t('rules.status_active') : t('rules.status_inactive')}
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                  {rule.type === 'scene' ? t('rules.tap_to_run') : t('rules.automation')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-3xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                    <Plus className="text-indigo-600 dark:text-indigo-400" />
                    {t('rules.new_rule')}
                  </h2>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleCreateRule} className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      {t('rules.modal_title')}
                    </label>
                    <input
                      type="text"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      placeholder={t('rules.modal_placeholder')}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/30 outline-none transition-all dark:text-white font-black text-sm uppercase tracking-tight"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                      {t('rules.modal_question')}
                    </label>
                    <div className="grid grid-cols-2 gap-5">
                      <button 
                        type="button" 
                        onClick={() => setRuleType('scene')}
                        className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${ruleType === 'scene' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                      >
                        <Smartphone size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('rules.tap_to_run')}</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setRuleType('automation')}
                        className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${ruleType === 'automation' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                      >
                        <Clock size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('rules.automation')}</span>
                      </button>
                    </div>
                  </div>

                  {ruleType === 'automation' && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800"
                    >
                        <div className="flex gap-4 mb-2">
                            <button 
                                type="button"
                                onClick={() => setTriggerType('device')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${triggerType === 'device' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                            >
                                {t('rules.trigger_device')}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setTriggerType('timer')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${triggerType === 'timer' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                            >
                                {t('rules.trigger_timer')}
                            </button>
                        </div>

                        {triggerType === 'device' ? (
                            <div className="space-y-4">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('rules.if_happens')}</label>
                                <select
                                    value={conditionDevice}
                                    onChange={(e) => setConditionDevice(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 outline-none dark:text-white font-black text-[10px] uppercase tracking-widest"
                                >
                                    <option value="">{t('rules.select_trigger')}</option>
                                    {devices.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                                {conditionDevice && (
                                    <div className="space-y-4 mt-4">
                                        {getCapabilitiesForCategory(devices.find(d => d._id === conditionDevice)?.type || 'generic').dps.map(dp => (
                                            <div key={dp.code} className="flex items-center justify-between gap-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{dp.name}:</span>
                                                {dp.type === 'boolean' ? (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setConditionDPValues({...conditionDPValues, [dp.code]: true})}
                                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${conditionDPValues[dp.code] === true ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                                                        >
                                                            ON
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setConditionDPValues({...conditionDPValues, [dp.code]: false})}
                                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${conditionDPValues[dp.code] === false ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                                                        >
                                                            OFF
                                                        </button>
                                                    </div>
                                                ) : dp.type === 'integer' ? (
                                                    <div className="flex items-center gap-3">
                                                        <input 
                                                            type="range" min={dp.min} max={dp.max} 
                                                            value={conditionDPValues[dp.code] || dp.min}
                                                            onChange={(e) => setConditionDPValues({...conditionDPValues, [dp.code]: parseInt(e.target.value)})}
                                                            className="w-24 accent-indigo-500"
                                                        />
                                                        <span className="text-[10px] font-black text-slate-800 dark:text-white w-6 text-right">{conditionDPValues[dp.code] || dp.min}</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('rules.schedule_for')}</label>
                                <div className="flex items-center gap-4">
                                    <Clock size={24} className="text-indigo-500" />
                                    <input 
                                        type="time" 
                                        value={scheduledTime}
                                        onChange={(e) => setScheduledTime(e.target.value)}
                                        className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-3 rounded-xl dark:text-white font-black text-sm"
                                    />
                                </div>
                                <div className="flex justify-between gap-1">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => {
                                                const newDays = [...scheduledDays];
                                                newDays[idx] = !newDays[idx];
                                                setScheduledDays(newDays);
                                            }}
                                            className={`w-10 h-10 rounded-2xl text-[10px] font-black transition-all ${scheduledDays[idx] ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                  )}

                  <div className="space-y-6 p-6 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30">
                    <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t('rules.do_this')}</label>
                    <select
                      value={selectedDevice}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/30 outline-none dark:text-white font-black text-[10px] uppercase tracking-widest"
                      required
                    >
                      <option value="">{t('rules.select_control')}</option>
                      {devices.map(d => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                    
                    {selectedDevice && (
                        <div className="space-y-4 mt-2">
                            {getCapabilitiesForCategory(devices.find(d => d._id === selectedDevice)?.type || 'generic').dps.map(dp => (
                                <div key={dp.code} className="flex items-center justify-between gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{dp.name}:</span>
                                    {dp.type === 'boolean' ? (
                                        <div className="flex gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setActionDPValues({...actionDPValues, [dp.code]: true})}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${actionDPValues[dp.code] === true ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                                            >
                                                ON
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setActionDPValues({...actionDPValues, [dp.code]: false})}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${actionDPValues[dp.code] === false ? 'bg-slate-400 text-white shadow-lg shadow-slate-500/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                                            >
                                                OFF
                                            </button>
                                        </div>
                                    ) : dp.type === 'integer' ? (
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="range" min={dp.min} max={dp.max} 
                                                value={actionDPValues[dp.code] || dp.min}
                                                onChange={(e) => setActionDPValues({...actionDPValues, [dp.code]: parseInt(e.target.value)})}
                                                className="w-32 accent-indigo-500"
                                            />
                                            <span className="text-[10px] font-black text-slate-800 dark:text-white w-8 text-right">{actionDPValues[dp.code] || dp.min}</span>
                                        </div>
                                    ) : dp.type === 'enum' ? (
                                        <select
                                            value={actionDPValues[dp.code] || dp.values?.[0]}
                                            onChange={(e) => setActionDPValues({...actionDPValues, [dp.code]: e.target.value})}
                                            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest dark:text-white outline-none"
                                        >
                                            {dp.values?.map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                                        </select>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black uppercase text-[10px] tracking-[0.2em] py-5 rounded-[2rem] shadow-2xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-3"
                  >
                    {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                    {isCreating ? t('rules.processing') : ruleType === 'scene' ? t('rules.create_scene') : t('rules.create_automation')}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SmartRules;
