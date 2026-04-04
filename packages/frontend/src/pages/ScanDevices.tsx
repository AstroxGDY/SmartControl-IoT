import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Radar, Wifi, Search, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { ScannedDeviceCard, type ScannedDevice } from '../components/ScannedDeviceCard';

export default function ScanDevices() {
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);
    const [devicesFound, setDevicesFound] = useState<ScannedDevice[]>([]);
    const [pairingDeviceId, setPairingDeviceId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
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

        try {
            const response = await fetch('http://localhost:3000/devices/scan', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('No se pudo conectar con el servidor.');
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

    const pairDevice = async (device: ScannedDevice) => {
        if (!device.params?.tuyaId) {
            setError("El dispositivo no tiene ID válido para emparejarse.");
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
                throw new Error(result.error || 'Fallo recuperando claves en la nube de Tuya.');
            }

            // Quitarlo visualmente de la lista de encontrados
            setDevicesFound(prev => prev.filter(d => d.params?.tuyaId !== device.params?.tuyaId));

        } catch (err: any) {
            setError(`Fallo emparejando con ${device.name}: ${err.message}`);
        } finally {
            setPairingDeviceId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
            {/* Header */}
            <header className="p-6 md:p-8 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/5">
                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
                >
                    <div className="p-2 rounded-full bg-slate-900 group-hover:bg-cyan-950/50 transition-colors">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="font-medium">Volver</span>
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-800/50 flex items-center justify-center">
                        <Wifi size={14} className="text-cyan-400" />
                    </div>
                    <span className="text-sm font-semibold tracking-wide text-slate-300">RED LOCAL</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-4xl mx-auto">

                {/* Texts */}
                <div className="text-center mb-12 max-w-lg">
                    <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-4 tracking-tight">
                        Descubrir Dispositivos
                    </h1>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Busca nuevos dispositivos inteligentes en tu red WiFi o Zigbee para emparejarlos con tu ecosistema.
                    </p>
                </div>

                {/* Radar Animation Area */}
                <div className="relative flex items-center justify-center w-full max-w-md aspect-square mb-12">

                    {/* Decorative Rings */}
                    <div className={`absolute inset-0 rounded-full border border-cyan-900/30 transition-all duration-1000 ${isScanning ? 'scale-100 opacity-100' : 'scale-75 opacity-50'}`} />
                    <div className={`absolute inset-8 rounded-full border border-cyan-800/40 transition-all duration-1000 delay-100 ${isScanning ? 'scale-100 opacity-100' : 'scale-75 opacity-50'}`} />
                    <div className={`absolute inset-16 rounded-full border border-cyan-700/50 transition-all duration-1000 delay-200 ${isScanning ? 'scale-100 opacity-100' : 'scale-75 opacity-50'}`} />

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
                                ? 'bg-cyan-950 border-2 border-cyan-500/50 text-cyan-400 scale-95 shadow-[0_0_40px_rgba(6,182,212,0.3)]'
                                : 'bg-gradient-to-tr from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 hover:scale-105 active:scale-95 text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.6)]'
                            }
            `}
                    >
                        {isScanning ? (
                            <>
                                <Radar size={40} className="animate-pulse" />
                                <span className="text-sm font-bold tracking-widest uppercase">Buscando</span>
                            </>
                        ) : (
                            <>
                                <Search size={40} />
                                <span className="text-lg font-bold tracking-wide">Escanear</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Results Area */}
                <div className="w-full max-w-2xl min-h-[200px]">
                    {isScanning && (
                        <div className="flex flex-col items-center justify-center text-cyan-500 animate-pulse mt-8">
                            <Loader2 className="animate-spin mb-4" size={32} />
                            <p>Analizando frecuencias detectadas...</p>
                        </div>
                    )}

                    {error && !isScanning && (
                        <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl flex items-start gap-4 backdrop-blur-sm">
                            <AlertTriangle className="text-red-400 flex-shrink-0" size={24} />
                            <div>
                                <h3 className="text-red-400 font-semibold text-lg mb-1">Fallo de escaneo</h3>
                                <p className="text-red-300/80">{error}</p>
                            </div>
                        </div>
                    )}

                    {scanComplete && !isScanning && !error && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <CheckCircle2 className="text-emerald-400" />
                                {devicesFound.length} Dispositivos Encontrados
                            </h3>

                            {devicesFound.length === 0 ? (
                                <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-2xl text-center flex flex-col items-center">
                                    <AlertTriangle className="text-red-400 mb-4" size={48} />
                                    <h3 className="text-red-400 font-bold text-xl mb-2">No se encontraron dispositivos</h3>
                                    <p className="text-red-300/80 mb-6">Asegúrate de que tus dispositivos Tuya estén encendidos y conectados a tu red local actual.</p>
                                    <button
                                        onClick={startScan}
                                        className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Search size={18} />
                                        Reintentar búsqueda
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
