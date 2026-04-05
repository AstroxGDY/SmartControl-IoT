import { useState, useEffect } from 'react';
import { X, Cpu, Server, Hash, Power, PowerOff, Loader2, Wifi } from 'lucide-react';

interface DeviceDetailsModalProps {
    device: any;
    onClose: () => void;
}

export const DeviceDetailsModal = ({ device, onClose }: DeviceDetailsModalProps) => {
    if (!device) return null;

    const metadata = device.attributes || {};

    // Estados principales
    const [liveDps, setLiveDps] = useState<Record<string, any>>(metadata.dps || {});
    const [schema, setSchema] = useState<any[]>(metadata.schema || []);
    const [isLoading, setIsLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(device.status !== 'online');

    const isOnline = !isOffline;

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`http://localhost:3000/devices/${device._id}/state`);
                const data = await res.json();

                if (data.offline || res.status === 503) {
                    setIsOffline(true);
                } else if (data.success && data.dps) {
                    setIsOffline(false);
                    setLiveDps(data.dps);
                    if (data.schema && Array.isArray(data.schema)) {
                        setSchema(data.schema);
                    }
                }
            } catch (e) {
                setIsOffline(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStatus();
    }, [device._id]);

    const [isToggling, setIsToggling] = useState(false);

    let togglePowerDP: string | undefined;

    // Detección 100% fiable mediante el esquema de Tuya Cloud
    if (schema.length > 0) {
        const primarySwitch = schema.find(s => s.code && s.code.startsWith('switch') && s.type === 'Boolean');
        if (primarySwitch) togglePowerDP = String(primarySwitch.dp_id);
    }

    // Fallback: modo heurístico
    if (!togglePowerDP) {
        if ('20' in liveDps && typeof liveDps['20'] === 'boolean') {
            togglePowerDP = '20';
        } else if ('1' in liveDps && typeof liveDps['1'] === 'boolean') {
            togglePowerDP = '1';
        } else {
            togglePowerDP = Object.keys(liveDps).find(k => typeof liveDps[k] === 'boolean');
        }
    }

    const handleToggle = async () => {
        if (!togglePowerDP) return;
        setIsToggling(true);
        try {
            const newValue = !liveDps[togglePowerDP];
            // En la vida real haríamos proxy a nuestro backend local
            const response = await fetch(`http://localhost:3000/devices/${device._id}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dp: togglePowerDP, value: newValue })
            });

            if (!response.ok) {
                alert('Hubo un error intentando cambiar el estado del dispositivo.');
            } else {
                // Reflejar localmente
                setLiveDps(prev => ({ ...prev, [togglePowerDP]: newValue }));
            }
        } catch (e) {
            console.error(e);
            alert('No se pudo conectar con el backend para enviar el comando.');
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header Dinámico con Borde del Color Principal */}
                <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-purple-50 overflow-hidden border border-purple-100 flex items-center justify-center shrink-0 p-1">
                            {device.image && device.image.startsWith('http') ? (
                                <img src={device.image} alt={device.name} className="w-full h-full object-contain drop-shadow-md" />
                            ) : (
                                <Cpu size={32} className="text-purple-400" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 leading-tight">{device.name}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 font-semibold text-xs rounded-full uppercase tracking-wider">
                                    Type: {device.type}
                                </span>
                                {isLoading ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold text-xs rounded-full uppercase tracking-wider bg-gray-100 text-gray-600">
                                        <Loader2 size={12} className="mr-0.5 animate-spin" /> Conectando
                                    </span>
                                ) : (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-bold text-xs rounded-full uppercase tracking-wider ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {isOnline ? <Wifi size={12} className="mr-0.5" /> : <PowerOff size={12} className="mr-0.5" />}
                                        {isOnline ? 'Conectado' : 'Desconectado'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-start">
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
                        <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar relative min-h-[300px]">

                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                            <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
                            <h3 className="text-lg font-bold text-gray-800">Conectando...</h3>
                            <p className="text-gray-500 text-sm">Obteniendo telemetría en tiempo real por UDP</p>
                        </div>
                    ) : null}

                    {isOnline ? (
                        <>
                            {/* Sección 1: Datos de Red Duros */}
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

                            {/* Sección 2: Matriz Genérica Data Points */}
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
                                                id: k, code: `DP ${k}`, type: typeof v === 'boolean' ? 'Boolean' : typeof v === 'number' ? 'Integer' : 'String', value: v, raw: null as any
                                            }));

                                        return items.map(({ id, code, type, value, raw }: { id: string, code: string, type: string, value: any, raw: any }) => {
                                            const isBoolean = type === 'Boolean';
                                            const isNumber = type === 'Integer';

                                            // Aplicar formato de Tuya
                                            let displayVal: any = value;
                                            let suffix = '';
                                            if (raw && raw.values) {
                                                try {
                                                    const sParams = JSON.parse(raw.values);
                                                    if (isNumber) {
                                                        if (sParams.scale > 0) {
                                                            displayVal = (value / Math.pow(10, sParams.scale)).toFixed(sParams.scale);
                                                        }
                                                        if (sParams.unit) suffix = ` ${sParams.unit}`;
                                                    }
                                                } catch (e) { }
                                            }

                                            return (
                                                <div key={id} className={`bg-white border shadow-sm p-3 rounded-xl transition-colors flex flex-col justify-between group ${String(id) === togglePowerDP && isBoolean ? 'border-purple-200 bg-purple-50/30' : 'border-gray-100'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${String(id) === togglePowerDP && isBoolean ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                                            {code.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-[9px] text-gray-400 font-bold px-1 uppercase scale-90 opacity-70">
                                                            ID {id}
                                                        </span>
                                                    </div>

                                                    <div className="mt-1">
                                                        {isBoolean ? (
                                                            <div className="flex items-center justify-between mt-1">
                                                                <span className={`text-sm font-bold ${displayVal ? 'text-green-600' : 'text-gray-400'}`}>{displayVal ? 'Encendido / True' : 'Apagado / False'}</span>
                                                                <div className={`w-8 h-4 rounded-full relative transition-colors ${displayVal ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                                    <div className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-all ${displayVal ? 'right-0.5' : 'left-0.5'}`}></div>
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
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center h-full">
                            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5 animate-pulse">
                                <PowerOff size={40} className="text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">Dispositivo Apagado</h3>
                            <p className="text-gray-500 text-sm flex-1">
                                El dispositivo se encuentra desconectado de la red. Si quieres obtener más detalles sobre el dispositivo, <strong className="text-gray-700">por favor enciéndelo</strong> (conectándolo a la electricidad o con su interruptor físico) y asegúrate de que esté conectado al WiFi.
                            </p>
                        </div>
                    )}

                    {/* Debug data visible solo para desarrollo */}
                    <div className="w-full text-left mt-6 bg-gray-100 p-4 rounded-xl overflow-x-auto border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 mb-2">DEBUG: Telemetría viva y Datos crudos</p>
                        <pre className="text-[10px] text-gray-700 font-mono whitespace-pre-wrap">
                            {JSON.stringify({ liveDps, isOffline, device }, null, 2)}
                        </pre>
                    </div>

                </div>
            </div>
        </div>
    );
};