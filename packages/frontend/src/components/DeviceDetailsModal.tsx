import { useState, useEffect, useRef } from 'react';
import { X, Cpu, Hash, Power, PowerOff, Loader2, Wifi, Trash2, Pencil, Check, Upload, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PRESET_ICONS } from '../config/deviceIcons';

interface DeviceDetailsModalProps {
    device: any;
    onClose: () => void;
    onDeleted?: (id: string) => void;
}

export const DeviceDetailsModal = ({ device, onClose, onDeleted }: DeviceDetailsModalProps) => {
    const { t } = useTranslation();
    
    // ── Hooks ──
    const [liveDps, setLiveDps] = useState<Record<string, any>>(device?.attributes?.dps ?? {});
    const [schema, setSchema] = useState<any[]>(device?.attributes?.schema ?? []);
    const [isLoading, setIsLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(device?.status !== 'online');
    const [isToggling, setIsToggling] = useState(false);
    const [unlinkStep, setUnlinkStep] = useState<'idle' | 'confirm' | 'deleting'>('idle');

    // Edit states
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(device?.name ?? '');
    const [tempImage, setTempImage] = useState(device?.image ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Logs state
    const [activeTab, setActiveTab] = useState<'controls' | 'history'>('controls');
    const [logs, setLogs] = useState<any[]>([]);
    const [isLogsLoading, setIsLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Live Status
    useEffect(() => {
        if (!device?._id) { setIsLoading(false); return; }
        setIsLoading(true);

        const fetchStatus = async () => {
            try {
                const res = await fetch(`http://localhost:3000/devices/${device._id}/state`);
                const data = await res.json();

                if (data.offline || res.status === 503) {
                    setIsOffline(true);
                } else if (data.success && data.dps) {
                    setIsOffline(false);
                    setLiveDps(data.dps);
                    if (Array.isArray(data.schema)) setSchema(data.schema);
                }
            } catch {
                setIsOffline(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();
    }, [device?._id]);

    // Fetch History Logs
    useEffect(() => {
        if (activeTab === 'history' && device?._id && logs.length === 0) {
            const fetchLogs = async () => {
                setIsLogsLoading(true);
                setLogsError(null);
                try {
                    const res = await fetch(`http://localhost:3000/devices/${device._id}/logs`);
                    const data = await res.json();
                    if (data.success && data.result?.logs) {
                        setLogs(data.result.logs);
                    } else if (data.error) {
                        setLogsError(data.error);
                    }
                } catch {
                    setLogsError(t('device_details.history_error'));
                } finally {
                    setIsLogsLoading(false);
                }
            };
            fetchLogs();
        }
    }, [activeTab, device?._id, logs.length, t]);

    if (!device) return null;

    const metadata = device.attributes ?? {};
    const isOnline = !isOffline;

    // Power DP detection
    let togglePowerDP: string | undefined;
    if (schema.length > 0) {
        const primarySwitch = schema.find((s: any) => s.code?.startsWith('switch') && s.type === 'Boolean');
        if (primarySwitch) togglePowerDP = String(primarySwitch.dp_id);
    }
    if (!togglePowerDP) {
        if ('20' in liveDps && typeof liveDps['20'] === 'boolean') togglePowerDP = '20';
        else if ('1' in liveDps && typeof liveDps['1'] === 'boolean') togglePowerDP = '1';
        else togglePowerDP = Object.keys(liveDps).find(k => typeof liveDps[k] === 'boolean');
    }

    const handleToggle = async () => {
        if (!togglePowerDP) return;
        setIsToggling(true);
        try {
            const newValue = !liveDps[togglePowerDP];
            const response = await fetch(`http://localhost:3000/devices/${device._id}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dp: togglePowerDP, value: newValue })
            });
            if (response.ok) {
                setLiveDps(prev => ({ ...prev, [togglePowerDP!]: newValue }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsToggling(false);
        }
    };

    const handleUnlink = async () => {
        setUnlinkStep('deleting');
        try {
            const res = await fetch(`http://localhost:3000/devices/${device._id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            onClose();
            onDeleted?.(device._id);
        } catch (e) {
            console.error('[Delete error]', e);
            setUnlinkStep('confirm');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`http://localhost:3000/devices/${device._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tempName, image: tempImage })
            });

            if (res.ok) {
                device.name = tempName;
                device.image = tempImage;
                setIsEditing(false);
                onDeleted?.(device._id); 
            }
        } catch (e) {
            console.error('[Save error]', e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setUploadError(t('device_details.upload_error'));
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('icon', file);

        try {
            const res = await fetch('http://localhost:3000/devices/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            if (data.success && data.url) {
                setTempImage(`http://localhost:3000${data.url}`);
            }
        } catch (err) {
            console.error('[Upload error]', err);
            setUploadError(t('device_details.upload_error'));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-transparent dark:border-slate-800 transition-colors duration-300">

                {/* Header */}
                <div className="p-6 pb-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div 
                            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-purple-50 dark:bg-purple-900/20 overflow-hidden border border-purple-100 dark:border-purple-800/30 flex items-center justify-center shrink-0 p-1 relative group transition-all ${isEditing ? 'cursor-pointer hover:border-purple-500' : ''}`}
                            onClick={isEditing ? () => fileInputRef.current?.click() : undefined}
                        >
                            {isUploading ? (
                                <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 z-10 flex items-center justify-center">
                                    <Loader2 size={24} className="text-purple-500 animate-spin" />
                                </div>
                            ) : null}

                            {tempImage?.startsWith('http') || tempImage?.startsWith('/') ? (
                                <img src={tempImage} alt={tempName} className="w-full h-full object-contain drop-shadow-md" />
                            ) : (
                                <Cpu className="text-purple-400 w-6 h-6 sm:w-8 sm:h-8" />
                            )}
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload size={20} className="text-white" />
                                </div>
                            )}
                        </div>

                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        
                        <div className="flex-1 min-w-0">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className="w-full text-lg sm:text-xl font-bold bg-white dark:bg-slate-800 border-b-2 border-purple-500 focus:outline-none text-gray-800 dark:text-slate-100"
                                    autoFocus
                                />
                            ) : (
                                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-slate-100 leading-tight truncate">{device.name}</h2>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-semibold text-xs rounded-full uppercase tracking-wider">
                                    {device.type}
                                </span>
                                {isLoading ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold text-xs rounded-full bg-gray-100 text-gray-600">
                                        <Loader2 size={12} className="animate-spin" /> {t('device_details.connecting')}
                                    </span>
                                ) : (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-bold text-xs rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {isOnline ? <Wifi size={12} /> : <PowerOff size={12} />}
                                        {isOnline ? t('device_card.status.online') : t('device_card.status.offline')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 self-start shrink-0">
                        {isEditing ? (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="p-1.5 sm:p-2 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-md transition-colors"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 sm:p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 border border-blue-100 dark:border-blue-900/30"
                            >
                                <Pencil size={16} />
                            </button>
                        )}

                        {!isEditing && !isLoading && isOnline && togglePowerDP && (
                            <button
                                onClick={handleToggle}
                                disabled={isToggling}
                                className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${liveDps[togglePowerDP] ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-500 text-white shadow-lg'}`}
                            >
                                <Power size={14} />
                                <span className="hidden xs:inline">{isToggling ? '...' : (liveDps[togglePowerDP] ? t('device_card.status.off_action') : t('device_card.status.on_action'))}</span>
                            </button>
                        )}

                        {!isEditing && (
                            <button onClick={() => setUnlinkStep('confirm')} className="p-1.5 sm:p-2 rounded-xl bg-red-50 text-red-400 border border-red-100">
                                <Trash2 size={16} />
                            </button>
                        )}

                        <button onClick={isEditing ? () => setIsEditing(false) : onClose} className="p-1.5 sm:p-2 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded-full">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-gray-50 dark:bg-slate-800/50 p-1 border-b border-gray-100 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('controls')}
                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${activeTab === 'controls' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {t('device_details.tab_controls')}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${activeTab === 'history' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {t('device_details.tab_history')}
                    </button>
                </div>

                <div className="p-6 overflow-y-auto relative min-h-[400px]">
                    {isEditing && activeTab === 'controls' && (
                        <div className="mb-8 space-y-4 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2 mb-4">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                    {t('device_details.change_icon')}
                                </h3>
                                {uploadError && (
                                    <span className="text-[10px] text-red-500 font-bold animate-pulse">
                                        {uploadError}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                {PRESET_ICONS.map((icon) => (
                                    <button
                                        key={icon.id}
                                        onClick={() => setTempImage(icon.path)}
                                        className={`p-2 rounded-xl border-2 transition-all hover:scale-110 ${tempImage === icon.path ? 'border-purple-500 bg-purple-50' : 'border-transparent bg-gray-50'}`}
                                    >
                                        <img src={icon.path} alt={icon.label} className="w-8 h-8 object-contain dark:invert" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isLoading && activeTab === 'controls' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
                            <Loader2 size={40} className="text-purple-500 animate-spin mb-4" />
                            <p className="font-bold text-gray-800 dark:text-slate-100">{t('device_details.connecting')}</p>
                        </div>
                    )}

                    {activeTab === 'controls' ? (
                        isOnline ? (
                            <div className="animate-in fade-in duration-300">
                                {/* Network info */}
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] text-gray-400 font-black uppercase mb-1">{t('device_details.local_ip')}</p>
                                        <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{metadata.ip || 'N/A'}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] text-gray-400 font-black uppercase mb-1">{t('device_details.local_key')}</p>
                                        <p className="font-mono text-[9px] font-bold text-purple-600 dark:text-purple-400 truncate">{metadata.localKey || 'Falta'}</p>
                                    </div>
                                </div>

                                {/* Data points */}
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Hash size={14} /> {t('device_details.data_points')}
                                </h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(liveDps).map(([id, value]) => {
                                        const dpSchema = schema.find(s => String(s.dp_id) === id);
                                        const name = dpSchema?.code?.replace(/_/g, ' ') || `DP ${id}`;
                                        const isBool = typeof value === 'boolean';
                                        
                                        return (
                                            <div key={id} className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{name}</span>
                                                    <span className="text-[9px] font-bold text-slate-300">ID {id}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    {isBool ? (
                                                        <>
                                                            <span className={`text-xs font-black ${value ? 'text-green-500' : 'text-slate-400'}`}>
                                                                {value ? 'ON' : 'OFF'}
                                                            </span>
                                                            <div className={`w-10 h-5 rounded-full relative ${value ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${value ? 'right-1' : 'left-1'}`} />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400 truncate">
                                                            {String(value)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-300">
                                <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
                                    <PowerOff size={40} className="text-red-400" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{t('device_details.device_off')}</h3>
                                <p className="text-sm text-slate-400 mt-2 max-w-[250px]">{t('device_details.offline_msg')}</p>
                            </div>
                        )
                    ) : (
                        /* History Tab Content */
                        <div className="animate-in fade-in duration-500">
                            {isLogsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-4 border-purple-100 dark:border-purple-900/30 border-t-purple-500 animate-spin" />
                                        <Loader2 size={24} className="absolute inset-0 m-auto text-purple-500 animate-pulse" />
                                    </div>
                                    <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">
                                        {t('device_details.history_loading')}
                                    </p>
                                </div>
                            ) : logsError ? (
                                <div className="p-8 text-center bg-red-50/50 dark:bg-red-900/10 rounded-3xl border border-red-100/50 dark:border-red-900/20 backdrop-blur-sm">
                                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertCircle className="text-red-500" size={32} />
                                    </div>
                                    <p className="font-bold text-red-700 dark:text-red-400 text-sm">{logsError}</p>
                                    <button 
                                        onClick={() => { setLogs([]); setActiveTab('history'); }}
                                        className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-200 transition-colors"
                                    >
                                        {t('scan.retry')}
                                    </button>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 opacity-50">
                                        <Hash className="text-slate-300 dark:text-slate-600" size={40} />
                                    </div>
                                    <p className="font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest text-xs">
                                        {t('device_details.history_empty')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('device_details.recent')}</h4>
                                        <span className="text-[9px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full uppercase">
                                            {logs.length} {t('device_details.events')}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {logs.map((log, idx) => {
                                            const dpSchema = schema.find(s => String(s.dp_id) === String(log.code));
                                            const name = dpSchema?.code?.replace(/_/g, ' ') || `DP ${log.code}`;
                                            const date = new Date(log.event_time);
                                            const isBool = typeof log.value === 'boolean';
                                            
                                            // Lógica de iconos dinámicos
                                            const isPower = name.toLowerCase().includes('switch') || name.toLowerCase().includes('power');
                                            
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className="group flex gap-4 items-center p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 backdrop-blur-sm"
                                                >
                                                    <div className="w-14 sm:w-16 shrink-0 text-center border-r border-slate-100 dark:border-slate-800 pr-3 sm:pr-4 flex flex-col justify-center">
                                                        <p className="text-[10px] sm:text-[11px] font-black text-purple-600 dark:text-purple-400 uppercase leading-none">
                                                            {date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                        </p>
                                                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-1.5 opacity-60">
                                                            {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0 flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isPower ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-500' : 'bg-slate-50 dark:bg-slate-800/60 text-slate-400'}`}>
                                                            {isPower ? <Power size={14} /> : <Hash size={14} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] sm:text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase truncate tracking-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                                {name}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 tracking-widest uppercase opacity-50">ID {log.code}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="shrink-0">
                                                        <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                                                            isBool 
                                                                ? (log.value 
                                                                    ? 'bg-green-500 text-white border-green-400' 
                                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-transparent')
                                                                : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border-purple-100 dark:border-purple-800/30'
                                                        }`}>
                                                            {isBool ? (log.value ? 'ON' : 'OFF') : String(log.value)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Unlink Confirmation */}
                {unlinkStep !== 'idle' && ( activeTab === 'controls' ) && (
                    <div className="absolute inset-x-6 bottom-6 animate-in slide-in-from-bottom duration-300">
                        <div className="bg-red-50 dark:bg-red-900 shadow-2xl rounded-3xl p-6 border border-red-100 dark:border-red-800">
                            <h4 className="font-black text-red-700 dark:text-red-100 mb-2 uppercase tracking-tight">{t('device_card.unlink.title')}</h4>
                            <p className="text-xs text-red-600 dark:text-red-300 mb-6 leading-relaxed">{t('device_card.unlink.warning')}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setUnlinkStep('idle')} className="flex-1 py-3 bg-white dark:bg-red-950 text-red-700 dark:text-red-100 rounded-xl font-bold text-xs uppercase transition-colors">{t('device_card.unlink.cancel')}</button>
                                <button onClick={handleUnlink} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-500/30">{t('device_card.unlink.confirm')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};