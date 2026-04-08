import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Radar, Wifi, Search, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ScannedDeviceCard, type ScannedDevice } from '../components/ScannedDeviceCard';
import { PortConflictModal, type PortConflict } from '../components/PortConflictModal';

export default function ScanDevices() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);
    const [devicesFound, setDevicesFound] = useState<ScannedDevice[]>([]);
    const [pairingDeviceId, setPairingDeviceId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [portConflict, setPortConflict] = useState<PortConflict[] | null>(null);
    const hasMounted = useRef(false);

    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            startScan();
        }
    }, []);

    const startScan = async () => {
        setIsScanning(true);
        setScanComplete(false);
        setDevicesFound([]);
        setError(null);
        setPortConflict(null);

        try {
            const response = await fetch('http://localhost:3000/devices/scan', {
                method: 'POST'
            });

            // 409 = conflicto de puertos
            if (response.status === 409) {
                const data = await response.json();
                setPortConflict(data.blockedBy || []);
                return;
            }

            if (!response.ok) {
                throw new Error(t('scan.error_scan'));
            }

            const data = await response.json();
            setDevicesFound(data.devices || []);
        } catch (err: any) {
            setError(err.message || 'Error desconocido');
        } finally {
            setIsScanning(false);
            setScanComplete(true);
        }
    };

    // Transforma errores técnicos en mensajes amigables para cualquier usuario
    const humanizePairError = (raw: string, deviceName: string): { title: string; detail: string; hint?: string } => {
        const r = raw.toLowerCase();

        if (r.includes('maximum call stack') || r.includes('stack size exceeded') || r.includes('circular')) {
            return {
                title: t('scan.pairing_errors.comm_fail.title', { name: deviceName }),
                detail: t('scan.pairing_errors.comm_fail.detail'),
                hint: t('scan.pairing_errors.comm_fail.hint'),
            };
        }
        if (r.includes('faltan credenciales') || r.includes('revisa tu .env') || r.includes('tuya cloud')) {
            return {
                title: t('scan.pairing_errors.config_fail.title'),
                detail: t('scan.pairing_errors.config_fail.detail'),
                hint: t('scan.pairing_errors.config_fail.hint'),
            };
        }
        if (r.includes('network error') || r.includes('failed to fetch') || r.includes('econnrefused') || r.includes('enotfound')) {
            return {
                title: t('scan.pairing_errors.no_conn.title'),
                detail: t('scan.pairing_errors.no_conn.detail'),
                hint: t('scan.pairing_errors.no_conn.hint'),
            };
        }
        if (r.includes('device id no encontrado') || r.includes('no encontrado en los dispositivos')) {
            return {
                title: t('scan.pairing_errors.not_linked.title', { name: deviceName }),
                detail: t('scan.pairing_errors.not_linked.detail'),
                hint: t('scan.pairing_errors.not_linked.hint'),
            };
        }
        if (r.includes('canceló') || r.includes('código') || r.includes('unauthorized') || r.includes('invalid')) {
            return {
                title: t('scan.pairing_errors.tuya_reject.title'),
                detail: t('scan.pairing_errors.tuya_reject.detail'),
                hint: t('scan.pairing_errors.tuya_reject.hint'),
            };
        }
        if (r.includes('timeout') || r.includes('timed out')) {
            return {
                title: t('scan.pairing_errors.timeout.title', { name: deviceName }),
                detail: t('scan.pairing_errors.timeout.detail'),
                hint: t('scan.pairing_errors.timeout.hint'),
            };
        }

        // Error genérico sin jerga técnica
        return {
            title: t('scan.pairing_errors.generic.title', { name: deviceName }),
            detail: t('scan.pairing_errors.generic.detail'),
            hint: t('scan.pairing_errors.generic.hint'),
        };
    };

    const pairDevice = async (device: ScannedDevice) => {
        if (!device.params?.tuyaId) {
            setError(t('scan.error_invalid_id'));
            return;
        }

        setPairingDeviceId(device.params.tuyaId);
        setError(null);

        try {
            const response = await fetch('http://localhost:3000/devices/pair', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceData: device })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || t('scan.error_pair_fallback'));
            }

            // Quitarlo visualmente de la lista de encontrados
            setDevicesFound(prev => prev.filter(d => d.params?.tuyaId !== device.params?.tuyaId));

        } catch (err: any) {
            const friendly = humanizePairError(err.message || 'Error desconocido', device.name);
            setError(JSON.stringify(friendly)); // guardamos el objeto como string para pasarlo al render
        } finally {
            setPairingDeviceId(null);
        }
    };

    return (
        <div className="min-h-full bg-[#F8F9FD] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 transition-colors duration-300">

            {/* Modal de conflicto de puertos */}
            {portConflict && (
                <PortConflictModal
                    conflicts={portConflict}
                    onClose={() => {
                        setPortConflict(null);
                        setIsScanning(false);
                        setScanComplete(false);
                    }}
                    onKilledAndRescan={() => {
                        setPortConflict(null);
                        startScan();
                    }}
                />
            )}
            {/* Header */}
            <header className="p-6 md:p-8 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 border-b border-gray-100 dark:border-white/5">
                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                    <div className="p-2 rounded-full bg-gray-100 dark:bg-slate-900 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-950/50 transition-colors">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="font-medium">{t('scan.back')}</span>
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-100 dark:border-cyan-800/50 flex items-center justify-center">
                        <Wifi size={14} className="text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-300">{t('scan.local_network')}</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-4xl mx-auto">

                {/* Texts */}
                <div className="text-center mb-12 max-w-lg">
                    <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-500 mb-4 tracking-tight">
                        {t('scan.title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
                        {t('scan.scan_desc')}
                    </p>
                </div>

                {/* Radar Animation Area */}
                <div className="relative flex items-center justify-center w-full max-w-md aspect-square mb-12">

                    {/* Decorative Rings */}
                    <div className={`absolute inset-0 rounded-full border border-cyan-200 dark:border-cyan-900/30 transition-all duration-1000 ${isScanning ? 'scale-100 opacity-100' : 'scale-75 opacity-50'}`} />
                    <div className={`absolute inset-8 rounded-full border border-cyan-300 dark:border-cyan-800/40 transition-all duration-1000 delay-100 ${isScanning ? 'scale-100 opacity-100' : 'scale-75 opacity-50'}`} />
                    <div className={`absolute inset-16 rounded-full border border-cyan-400/30 dark:border-cyan-700/50 transition-all duration-1000 delay-200 ${isScanning ? 'scale-100 opacity-100' : 'scale-75 opacity-50'}`} />

                    {/* Radar Sweep Effect */}
                    {isScanning && (
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                            <div
                                className="w-full h-full"
                                style={{
                                    background: 'conic-gradient(from 0deg, transparent 0%, transparent 70%, rgba(6, 182, 212, 0.4) 100%)',
                                    animation: 'spin 2s linear infinite'
                                }}
                            />
                        </div>
                    )}

                    {/* Central Button */}
                    <button
                        onClick={startScan}
                        disabled={isScanning}
                        className={`
              relative z-10 
              w-32 h-32 md:w-40 md:h-40 rounded-full 
              flex flex-col items-center justify-center gap-3
              transition-all duration-300 shadow-2xl
              ${isScanning
                                ? 'bg-cyan-50 dark:bg-cyan-950 border-2 border-cyan-300 dark:border-cyan-500/50 text-cyan-600 dark:text-cyan-400 scale-95 shadow-[0_0_40px_rgba(6,182,212,0.1)] dark:shadow-[0_0_40px_rgba(6,182,212,0.3)]'
                                : 'bg-gradient-to-tr from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 hover:scale-105 active:scale-95 text-white shadow-[0_0_30px_rgba(6,182,212,0.2)] dark:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.4)] dark:hover:shadow-[0_0_50px_rgba(6,182,212,0.6)]'
                            }
            `}
                    >
                        {isScanning ? (
                            <>
                                <Radar size={40} className="animate-pulse" />
                                <span className="text-sm font-bold tracking-widest uppercase">{t('scan.searching')}</span>
                            </>
                        ) : (
                            <>
                                <Search size={40} />
                                <span className="text-lg font-bold tracking-wide">{t('scan.scan_action')}</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Results Area */}
                <div className="w-full max-w-2xl min-h-[200px]">
                    {isScanning && (
                        <div className="flex flex-col items-center justify-center text-cyan-500 animate-pulse mt-8">
                            <Loader2 className="animate-spin mb-4" size={32} />
                            <p>{t('scan.analyzing_freq')}</p>
                        </div>
                    )}

                    {error && !isScanning && (() => {
                        // Intentar parsear como objeto humanizado, si falla mostrar raw
                        let parsed: { title: string; detail: string; hint?: string } | null = null;
                        try { parsed = JSON.parse(error); } catch {}

                        return (
                            <div className="bg-red-500/10 border border-red-500/40 p-6 rounded-2xl backdrop-blur-sm" style={{ animation: 'fadeIn .3s ease' }}>
                                <div className="flex items-start gap-4 mb-3">
                                    <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={22} />
                                    <div className="flex-1">
                                        <h3 className="text-red-400 font-bold text-base mb-1">
                                            {parsed ? parsed.title : t('scan.error_scan')}
                                        </h3>
                                        <p className="text-red-300/80 text-sm leading-relaxed">
                                            {parsed ? parsed.detail : error}
                                        </p>
                                    </div>
                                </div>
                                {parsed?.hint && (
                                    <div className="ml-9 mt-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
                                        <span className="text-amber-400 text-xs font-bold uppercase tracking-wide flex-shrink-0 mt-0.5">{t('scan.how_to_solve')}</span>
                                        <p className="text-amber-300/80 text-xs leading-relaxed ml-2">{parsed.hint}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {scanComplete && !isScanning && !error && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <CheckCircle2 className="text-emerald-400" />
                                {devicesFound.length} {t('scan.found')}
                            </h3>

                            {devicesFound.length === 0 ? (
                                <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-2xl text-center flex flex-col items-center">
                                    <AlertTriangle className="text-red-400 mb-4" size={48} />
                                    <h3 className="text-red-400 font-bold text-xl mb-2">{t('scan.none_found')}</h3>
                                    <p className="text-red-300/80 mb-6">{t('scan.scan_advice')}</p>
                                    <button
                                        onClick={startScan}
                                        className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Search size={18} />
                                        {t('scan.retry')}
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-4 custom-scrollbar">
                                    {devicesFound.map((device, idx) => (
                                        <ScannedDeviceCard
                                            key={idx}
                                            device={device}
                                            isPairing={pairingDeviceId === device.params?.tuyaId}
                                            onAdd={() => pairDevice(device)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Global CSS for custom animations that might not be in the default Tailwind configuration */}
            <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
        </div>
    );
}
