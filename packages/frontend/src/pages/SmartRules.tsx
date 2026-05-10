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

    // 1. Build actions
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

    // 2. Build conditions if automation
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
            // Convert boolean days to "1111111" string
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
        setError(data.msg || 'Error al crear la regla');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Zap className="text-purple-500 fill-purple-500/20" size={36} />
            {t('rules.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            {t('rules.subtitle')}
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-purple-500/30 transition-all"
        >
          <Plus size={20} />
          {t('rules.new_rule')}
        </motion.button>
      </header>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 flex items-center gap-3 shadow-xl"
          >
            <AlertCircle size={20} />
            <div className="flex-1 font-medium">{error}</div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-600 dark:text-emerald-400 flex items-center gap-3 shadow-xl"
          >
            <CheckCircle2 size={20} />
            <div className="font-medium">{successMsg}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="animate-spin text-purple-500 mb-4" size={48} />
          <p className="text-slate-500 dark:text-slate-400 animate-pulse font-medium">
            Sincronizando reglas con Tuya Cloud...
          </p>
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap className="text-slate-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {t('rules.no_rules')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 font-medium">
            {t('rules.create_desc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rules.map((rule) => (
            <motion.div
              layout
              key={rule.id}
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
              
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${rule.type === 'scene' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                  <Zap size={24} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleTrigger(rule.id)}
                    disabled={executing === rule.id}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white transition-all disabled:opacity-50"
                    title={t('rules.trigger')}
                  >
                    {executing === rule.id ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                  </button>
                  <button 
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-all"
                    title={t('rules.delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 line-clamp-1">
                {rule.name}
              </h3>
              
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className={`px-3 py-1 rounded-full ${rule.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'}`}>
                  {rule.enabled ? t('rules.status_active') : t('rules.status_inactive')}
                </span>
                <span className="text-slate-400 dark:text-slate-500 capitalize">
                  {rule.type === 'scene' ? t('rules.tap_to_run') : t('rules.automation')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Nueva Regla */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Plus className="text-purple-500" />
                    {t('rules.new_rule')}
                  </h2>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-300 border border-slate-200 dark:border-slate-700 shadow-sm"
                    title={t('common.close')}
                  >
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <form onSubmit={handleCreateRule} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Nombre de la regla
                    </label>
                    <input
                      type="text"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      placeholder="Ej: Modo Cine, Luces Off..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                      ¿Qué quieres automatizar?
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        type="button" 
                        onClick={() => setRuleType('scene')}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${ruleType === 'scene' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                      >
                        <Smartphone size={24} />
                        <span className="text-xs font-bold uppercase tracking-wider">{t('rules.tap_to_run')}</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setRuleType('automation')}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${ruleType === 'automation' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                      >
                        <Clock size={24} />
                        <span className="text-xs font-bold uppercase tracking-wider">{t('rules.automation')}</span>
                      </button>
                    </div>
                  </div>

                  {ruleType === 'automation' && (
                    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex gap-4 mb-4">
                            <button 
                                type="button"
                                onClick={() => setTriggerType('device')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold ${triggerType === 'device' ? 'bg-slate-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}
                            >
                                DISPOSITIVO
                            </button>
                            <button 
                                type="button"
                                onClick={() => setTriggerType('timer')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold ${triggerType === 'timer' ? 'bg-slate-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}
                            >
                                HORARIO
                            </button>
                        </div>

                        {triggerType === 'device' ? (
                            <>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">SI OCURRE ESTO...</label>
                                <select
                                    value={conditionDevice}
                                    onChange={(e) => setConditionDevice(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white"
                                >
                                    <option value="">Selecciona dispositivo disparador...</option>
                                    {devices.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                                {conditionDevice && (
                                    <div className="space-y-3 mt-4">
                                        {getCapabilitiesForCategory(devices.find(d => d._id === conditionDevice)?.type || 'generic').dps.map(dp => (
                                            <div key={dp.code} className="flex items-center justify-between">
                                                <span className="text-sm font-medium dark:text-slate-400">{dp.name}:</span>
                                                {dp.type === 'boolean' ? (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setConditionDPValues({...conditionDPValues, [dp.code]: true})}
                                                            className={`px-3 py-1 rounded-lg text-xs font-bold ${conditionDPValues[dp.code] === true ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}
                                                        >
                                                            ON
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setConditionDPValues({...conditionDPValues, [dp.code]: false})}
                                                            className={`px-3 py-1 rounded-lg text-xs font-bold ${conditionDPValues[dp.code] === false ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}
                                                        >
                                                            OFF
                                                        </button>
                                                    </div>
                                                ) : dp.type === 'integer' ? (
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="range" min={dp.min} max={dp.max} 
                                                            value={conditionDPValues[dp.code] || dp.min}
                                                            onChange={(e) => setConditionDPValues({...conditionDPValues, [dp.code]: parseInt(e.target.value)})}
                                                            className="w-24 accent-purple-500"
                                                        />
                                                        <span className="text-xs font-mono dark:text-white">{conditionDPValues[dp.code] || dp.min}</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">PROGRAMAR PARA...</label>
                                <div className="flex items-center gap-4">
                                    <Clock size={20} className="text-slate-400" />
                                    <input 
                                        type="time" 
                                        value={scheduledTime}
                                        onChange={(e) => setScheduledTime(e.target.value)}
                                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg dark:text-white"
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
                                            className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${scheduledDays[idx] ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                  )}

                  <div className="space-y-4 p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                    <label className="block text-xs font-bold text-purple-500 uppercase tracking-widest mb-1">HACER ESTO...</label>
                    <select
                      value={selectedDevice}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white"
                      required
                    >
                      <option value="">Elegir dispositivo a controlar...</option>
                      {devices.map(d => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                    
                    {selectedDevice && (
                        <div className="space-y-4 mt-2">
                            {getCapabilitiesForCategory(devices.find(d => d._id === selectedDevice)?.type || 'generic').dps.map(dp => (
                                <div key={dp.code} className="flex items-center justify-between">
                                    <span className="text-sm font-medium dark:text-slate-400">{dp.name}:</span>
                                    {dp.type === 'boolean' ? (
                                        <div className="flex gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setActionDPValues({...actionDPValues, [dp.code]: true})}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${actionDPValues[dp.code] === true ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}
                                            >
                                                ON
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setActionDPValues({...actionDPValues, [dp.code]: false})}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${actionDPValues[dp.code] === false ? 'bg-slate-400 text-white shadow-lg shadow-slate-500/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}
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
                                                className="w-32 accent-purple-500"
                                            />
                                            <span className="text-xs font-mono dark:text-white w-8 text-right">{actionDPValues[dp.code] || dp.min}</span>
                                        </div>
                                    ) : dp.type === 'enum' ? (
                                        <select
                                            value={actionDPValues[dp.code] || dp.values?.[0]}
                                            onChange={(e) => setActionDPValues({...actionDPValues, [dp.code]: e.target.value})}
                                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs dark:text-white outline-none"
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
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    {isCreating ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                    {isCreating ? 'Procesando...' : ruleType === 'scene' ? 'Crear Escena Manual' : 'Crear Automatización'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartRules;
