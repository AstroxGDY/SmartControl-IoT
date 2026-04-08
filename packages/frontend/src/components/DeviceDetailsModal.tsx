import { useState, useEffect, useRef } from 'react';
import { X, Cpu, Server, Hash, Power, PowerOff, Loader2, Wifi, Trash2, Pencil, Check, Image as ImageIcon, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PRESET_ICONS } from '../config/deviceIcons';

interface DeviceDetailsModalProps {
    device: any;
    onClose: () => void;
    onDeleted?: (id: string) => void;
}

export const DeviceDetailsModal = ({ device, onClose, onDeleted }: DeviceDetailsModalProps) => {
    const { t } = useTranslation();
    // ── Todos los hooks PRIMERO, sin early-returns antes de ellos ──────────
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

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Guard DESPUÉS de todos los hooks ─────────────────────────────────────
    if (!device) return null;

    const metadata = device.attributes ?? {};
    const isOnline = !isOffline;

    // Detectar el DP de encendido/apagado
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
                // Update local device object properties (though parent should re-fetch)
                device.name = tempName;
                device.image = tempImage;
                setIsEditing(false);
                // Trigger parent refresh if callback exists
                onDeleted?.(device._id); // Re-using onDeleted to trigger a refresh in the parent (Dashboard/Devices)
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

        // Validaciones básicas en cliente
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

                        {/* Hidden File Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
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
                                title={t('device_details.save_changes')}
                            >
                                {isSaving ? <Loader2 size={16} className="sm:w-4 sm:h-4 animate-spin" /> : <Check size={16} className="sm:w-4 sm:h-4" />}
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 sm:p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-500 dark:text-blue-400 transition-colors border border-blue-100 dark:border-blue-900/30"
                                title={t('device_details.edit')}
                            >
                                <Pencil size={16} className="sm:w-4 sm:h-4" />
                            </button>
                        )}

                        {!isEditing && !isLoading && isOnline && togglePowerDP && (
                            <button
                                onClick={handleToggle}
                                disabled={isToggling}
                                className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-[10px] sm:text-sm shadow-md transition-colors disabled:opacity-50 flex items-center gap-1 sm:gap-2 ${liveDps[togglePowerDP] ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-transparent dark:border-red-900/30' : 'bg-green-500 text-white hover:bg-green-600'}`}
                            >
                                <Power size={14} className="sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline">{isToggling ? '...' : (liveDps[togglePowerDP] ? t('device_card.status.off_action', { defaultValue: 'Apagar' }) : t('device_card.status.on_action', { defaultValue: 'Encender' }))}</span>
                            </button>
                        )}

                        {/* Botón Eliminar */}
                        {!isEditing && (
                            <button
                                onClick={() => setUnlinkStep(s => s === 'idle' ? 'confirm' : s)}
                                disabled={unlinkStep !== 'idle'}
                                title="Eliminar dispositivo"
                                className="p-1.5 sm:p-2 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-400 dark:text-red-500 transition-colors border border-red-100 dark:border-red-900/30 disabled:opacity-40"
                            >
                                <Trash2 size={16} className="sm:w-4 sm:h-4" />
                            </button>
                        )}

                        <button onClick={isEditing ? () => setIsEditing(false) : onClose} className="p-1.5 sm:p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 rounded-full transition-colors">
                            <X size={18} className="sm:w-4 sm:h-4" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto relative min-h-[300px]">

                    {isEditing && (
                        <div className="mb-8 space-y-4" style={{ animation: 'fadeIn .2s ease' }}>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2"><ImageIcon size={16} /> {t('device_details.change_icon')}</span>
                                {uploadError && <span className="text-[10px] text-red-500 normal-case font-semibold">{uploadError}</span>}
                            </h3>
                            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                                {PRESET_ICONS.map((icon) => (
                                    <button
                                        key={icon.id}
                                        onClick={() => setTempImage(icon.path)}
                                        className={`p-2 sm:p-3 rounded-xl border-2 transition-all flex items-center justify-center hover:scale-105 ${tempImage === icon.path ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-lg shadow-purple-900/10' : 'border-transparent bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                                        title={icon.label}
                                    >
                                        <img src={icon.path} alt={icon.label} className="w-8 h-8 sm:w-8 sm:h-8 object-contain dark:invert" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                            <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
                            <h3 className="text-lg font-bold text-gray-800">{t('device_details.connecting')}</h3>
                            <p className="text-gray-500 text-sm">{t('device_details.telemetry_udp')}</p>
                        </div>
                    )}

                    {isOnline ? (
                        <>
                            {/* Metadatos de Red */}
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Server size={16} /> {t('device_details.network_metadata')}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                                <div className="bg-gray-50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{t('device_details.local_ip')}</p>
                                    <p className="font-mono text-sm font-semibold text-gray-700 dark:text-slate-300 truncate">{metadata.ip || 'N/A'}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{t('device_details.connection')}</p>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">{device.connectionType || 'WiFi'}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800 sm:col-span-2">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{t('device_details.local_key')}</p>
                                    <p className="font-mono text-xs font-semibold text-purple-600 dark:text-purple-400 truncate bg-purple-50 dark:bg-purple-900/30 p-1.5 rounded border border-transparent dark:border-purple-800/30">{metadata.localKey || 'Falta'}</p>
                                </div>
                            </div>

                            {/* Data Points */}
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Hash size={16} /> {t('device_details.data_points')} {schema.length > 0 ? t('device_details.mapping_cloud') : t('device_details.raw')}
                            </h3>

                            {Object.keys(liveDps).length === 0 ? (
                                <div className="bg-yellow-50 text-yellow-600 p-4 rounded-xl text-sm italic border border-yellow-100 text-center">
                                    {t('device_details.no_dps')}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(() => {
                                        const items = schema.length > 0
                                            ? schema.filter((s: any) => liveDps[String(s.dp_id)] !== undefined).map((s: any) => ({
                                                id: String(s.dp_id), code: s.code, type: s.type, value: liveDps[String(s.dp_id)], raw: s
                                            }))
                                            : Object.entries(liveDps).map(([k, v]) => ({
                                                id: k, code: `DP ${k}`,
                                                type: typeof v === 'boolean' ? 'Boolean' : typeof v === 'number' ? 'Integer' : 'String',
                                                value: v, raw: null as any
                                            }));

                                        return items.map(({ id, code, type, value, raw }) => {
                                            const isBoolean = type === 'Boolean';
                                            const isNumber = type === 'Integer';
                                            let displayVal: any = value;
                                            let suffix = '';
                                            if (raw?.values) {
                                                try {
                                                    const p = JSON.parse(raw.values);
                                                    if (isNumber && p.scale > 0) displayVal = (value / Math.pow(10, p.scale)).toFixed(p.scale);
                                                    if (p.unit) suffix = ` ${p.unit}`;
                                                } catch { /* ignore */ }
                                            }

                                            return (
                                                <div key={id} className={`bg-white dark:bg-slate-800/50 border shadow-sm p-3 rounded-xl flex flex-col justify-between transition-colors ${id === togglePowerDP && isBoolean ? 'border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/20' : 'border-gray-100 dark:border-slate-700'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${id === togglePowerDP && isBoolean ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}>
                                                            {code.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold">ID {id}</span>
                                                    </div>
                                                    <div className="mt-1">
                                                        {isBoolean ? (
                                                            <div className="flex items-center justify-between">
                                                                <span className={`text-sm font-bold ${displayVal ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}>
                                                                    {displayVal ? t('device_card.status.on') : t('device_card.status.off')}
                                                                </span>
                                                                <div className={`w-8 h-4 rounded-full relative transition-colors ${displayVal ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                                                                    <div className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-all ${displayVal ? 'right-0.5' : 'left-0.5'}`} />
                                                                </div>
                                                            </div>
                                                        ) : isNumber ? (
                                                            <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                                                                {displayVal}<span className="text-sm font-semibold text-gray-400 dark:text-gray-500 ml-1">{suffix}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 break-words">{String(displayVal)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5 animate-pulse">
                                <PowerOff size={40} className="text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">{t('device_details.device_off')}</h3>
                            <p className="text-gray-500 text-sm">
                                {t('device_details.offline_msg')}
                            </p>
                        </div>
                    )}

                    {/* Panel de confirmación de desvinculación */}
                    {unlinkStep !== 'idle' && (
                        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-col gap-4 shadow-sm" style={{ animation: 'fadeIn .2s ease' }}>
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <Trash2 size={18} className="text-red-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-red-700 text-sm">¿Desvincular este dispositivo?</p>
                                    <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
                                        Se borrará <strong>{device.name}</strong> de la base de datos local. Podrás volver a vincularlo desde el escáner de red.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setUnlinkStep('idle')}
                                    disabled={unlinkStep === 'deleting'}
                                    className="flex-1 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-sm font-semibold transition-colors disabled:opacity-40"
                                >
                                    {t('device_card.unlink.cancel')}
                                </button>
                                <button
                                    onClick={handleUnlink}
                                    disabled={unlinkStep === 'deleting'}
                                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                                >
                                    {unlinkStep === 'deleting' ? (
                                        <><Loader2 size={14} className="animate-spin" /> {t('common.delete')}...</>
                                    ) : (
                                        <><Trash2 size={14} /> {t('device_card.unlink.confirm')}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Debug */}
                    <details className="mt-6">
                        <summary className="text-xs font-bold text-gray-400 cursor-pointer hover:text-gray-600">{t('device_details.debug')}</summary>
                        <pre className="mt-2 text-[10px] text-gray-700 font-mono whitespace-pre-wrap bg-gray-100 p-3 rounded-xl border border-gray-200 overflow-x-auto">
                            {JSON.stringify({ liveDps, isOffline, device }, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
            `}</style>
        </div>
    );
};