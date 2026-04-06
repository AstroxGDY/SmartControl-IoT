import { useState, useEffect } from 'react';
import { X, Cpu, Server, Hash, Power, PowerOff, Loader2, Wifi, Trash2 } from 'lucide-react';

interface DeviceDetailsModalProps {
    device: any;
    onClose: () => void;
    onDeleted?: (id: string) => void;
}

export const DeviceDetailsModal = ({ device, onClose, onDeleted }: DeviceDetailsModalProps) => {
    // ── Todos los hooks PRIMERO, sin early-returns antes de ellos ──────────
    const [liveDps, setLiveDps] = useState<Record<string, any>>(device?.attributes?.dps ?? {});
    const [schema, setSchema] = useState<any[]>(device?.attributes?.schema ?? []);
    const [isLoading, setIsLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(device?.status !== 'online');
    const [isToggling, setIsToggling] = useState(false);
    const [unlinkStep, setUnlinkStep] = useState<'idle' | 'confirm' | 'deleting'>('idle');

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-purple-50 overflow-hidden border border-purple-100 flex items-center justify-center shrink-0 p-1">
                            {device.image?.startsWith('http') ? (
                                <img src={device.image} alt={device.name} className="w-full h-full object-contain drop-shadow-md" />
                            ) : (
                                <Cpu size={32} className="text-purple-400" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 leading-tight">{device.name}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 font-semibold text-xs rounded-full uppercase tracking-wider">
                                    {device.type}
                                </span>
                                {isLoading ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold text-xs rounded-full bg-gray-100 text-gray-600">
                                        <Loader2 size={12} className="animate-spin" /> Conectando
                                    </span>
                                ) : (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-bold text-xs rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {isOnline ? <Wifi size={12} /> : <PowerOff size={12} />}
                                        {isOnline ? 'Conectado' : 'Desconectado'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                        {!isLoading && isOnline && togglePowerDP && (
                            <button
                                onClick={handleToggle}
                                disabled={isToggling}
                                className={`px-4 py-2 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-50 flex items-center gap-2 ${liveDps[togglePowerDP] ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-500 text-white hover:bg-green-600'}`}
                            >
                                <Power size={16} />
                                {isToggling ? '...' : (liveDps[togglePowerDP] ? 'Apagar' : 'Encender')}
                            </button>
                        )}

                        {/* Botón Eliminar */}
                        <button
                            onClick={() => setUnlinkStep(s => s === 'idle' ? 'confirm' : s)}
                            disabled={unlinkStep !== 'idle'}
                            title="Eliminar dispositivo"
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors border border-red-100 disabled:opacity-40"
                        >
                            <Trash2 size={18} />
                        </button>

                        <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto relative min-h-[300px]">

                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                            <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
                            <h3 className="text-lg font-bold text-gray-800">Conectando...</h3>
                            <p className="text-gray-500 text-sm">Obteniendo telemetría en tiempo real por UDP</p>
                        </div>
                    )}

                    {isOnline ? (
                        <>
                            {/* Metadatos de Red */}
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Server size={16} /> Metadatos de Red
                            </h3>
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">IP Local</p>
                                    <p className="font-mono text-sm font-semibold text-gray-700 truncate">{metadata.ip || 'N/A'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Conexión</p>
                                    <p className="text-sm font-semibold text-gray-700">{device.connectionType || 'WiFi'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Local Key (Secreta)</p>
                                    <p className="font-mono text-xs font-semibold text-purple-600 truncate bg-purple-50 p-1.5 rounded">{metadata.localKey || 'Falta'}</p>
                                </div>
                            </div>

                            {/* Data Points */}
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Hash size={16} /> Data Points {schema.length > 0 ? '(Mapeo Cloud)' : '(Crudos)'}
                            </h3>

                            {Object.keys(liveDps).length === 0 ? (
                                <div className="bg-yellow-50 text-yellow-600 p-4 rounded-xl text-sm italic border border-yellow-100 text-center">
                                    No se detectaron Data Points. ¿El dispositivo está desconectado físicamente?
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
                                                <div key={id} className={`bg-white border shadow-sm p-3 rounded-xl flex flex-col justify-between ${id === togglePowerDP && isBoolean ? 'border-purple-200 bg-purple-50/30' : 'border-gray-100'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${id === togglePowerDP && isBoolean ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                                            {code.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-[9px] text-gray-400 font-bold">ID {id}</span>
                                                    </div>
                                                    <div className="mt-1">
                                                        {isBoolean ? (
                                                            <div className="flex items-center justify-between">
                                                                <span className={`text-sm font-bold ${displayVal ? 'text-green-600' : 'text-gray-400'}`}>
                                                                    {displayVal ? 'Encendido' : 'Apagado'}
                                                                </span>
                                                                <div className={`w-8 h-4 rounded-full relative transition-colors ${displayVal ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                                    <div className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-all ${displayVal ? 'right-0.5' : 'left-0.5'}`} />
                                                                </div>
                                                            </div>
                                                        ) : isNumber ? (
                                                            <span className="text-lg font-black text-purple-600">
                                                                {displayVal}<span className="text-sm font-semibold text-gray-400 ml-1">{suffix}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm font-semibold text-gray-700 break-words">{String(displayVal)}</span>
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
                            <h3 className="text-xl font-bold text-gray-800 mb-3">Dispositivo Apagado</h3>
                            <p className="text-gray-500 text-sm">
                                El dispositivo no está disponible en la red. Comprueba que esté enchufado y conectado al WiFi.
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
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUnlink}
                                    disabled={unlinkStep === 'deleting'}
                                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                                >
                                    {unlinkStep === 'deleting' ? (
                                        <><Loader2 size={14} className="animate-spin" /> Eliminando...</>
                                    ) : (
                                        <><Trash2 size={14} /> Sí, eliminar</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Debug */}
                    <details className="mt-6">
                        <summary className="text-xs font-bold text-gray-400 cursor-pointer hover:text-gray-600">DEBUG: Telemetría</summary>
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