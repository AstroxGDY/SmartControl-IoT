import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bluetooth, Smartphone, Volume2, Play, Pause, 
  SkipForward, SkipBack, Loader2, AlertCircle, RefreshCw,
  Search, CheckCircle2, Music
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BTDevice {
  name: string;
  id: string;
}

export default function BluetoothManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BTDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BTDevice | null>(null);
  const [volume, setVolume] = useState(50);
  const [mediaState, setMediaState] = useState<{ status: string; title: string; artist: string }>({
    status: 'NONE',
    title: '',
    artist: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const hasMounted = useRef(false);

  // Poller de estado cada 3 segundos
  useEffect(() => {
    const fetchState = async () => {
      try {
        const response = await fetch('http://localhost:3000/devices/bluetooth/state');
        const data = await response.json();
        if (data.success) {
          setMediaState({
            status: data.status,
            title: data.title,
            artist: data.artist
          });
        }
      } catch (e) {
        console.warn("Error polling state", e);
      }
    };

    const interval = setInterval(fetchState, 3000);
    fetchState(); // Carga inicial

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      scanDevices();
    }
  }, []);

  const scanDevices = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/devices/bluetooth/scan');
      const data = await response.json();
    if (data.success) {
        setDevices(data.devices || []);
      } else {
        throw new Error(data.error || 'Fallo al escanear');
      }
    } catch (err: any) {
      setError({
        title: t('bluetooth.controls.hardware_error'),
        detail: err.message
      });
    } finally {
      setIsScanning(false);
    }
  };

  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      // 1. Prioridad: Dispositivo seleccionado
      if (selectedDevice?.id === a.id) return -1;
      if (selectedDevice?.id === b.id) return 1;
      
      // 2. Alfabético por nombre
      return a.name.localeCompare(b.name);
    });
  }, [devices, selectedDevice]);

  const sendCommand = async (command: string, value?: any) => {
    setIsSyncing(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/devices/bluetooth/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command, 
          value, 
          deviceName: selectedDevice?.name,
          deviceId: selectedDevice?.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error de control');
      }
      
      if (command === 'volume') setVolume(value);

    } catch (err: any) {
      setError({
        title: t('bluetooth.controls.exception_title'),
        detail: err.message
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const selectDevice = async (device: BTDevice) => {
    setSelectedDevice(device);
    // Persistimos en la BD
    try {
      await fetch('http://localhost:3000/devices/bluetooth/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: device.name, id: device.id })
      });
    } catch (e) {
      console.error("Error persistiendo device", e);
    }
  };

  return (
    <div className="min-h-full bg-[#F8F9FD] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Header */}
      <header className="p-6 md:p-8 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 border-b border-gray-100 dark:border-white/5">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <div className="p-2 rounded-full bg-gray-100 dark:bg-slate-900 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 transition-colors">
            <ArrowLeft size={18} />
          </div>
          <span className="font-medium">{t('bluetooth.scan.back')}</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center">
            <Bluetooth size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-300">WINDOWS AUDIO</span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Scanner & Device List */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Search size={20} className="text-blue-500" />
                {t('bluetooth.scan.title')}
              </h2>
              <button 
                onClick={scanDevices}
                disabled={isScanning}
                className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-400 transition-all hover:rotate-180 duration-500"
              >
                <RefreshCw size={18} className={isScanning ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {isScanning ? (
                <div className="flex flex-col items-center py-12 text-slate-400">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                    <Loader2 size={40} className="animate-spin text-blue-500 relative z-10" />
                  </div>
                  <p className="text-sm font-medium animate-pulse">{t('bluetooth.scan.searching')}</p>
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-2xl">
                  <Smartphone size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-slate-400">{t('bluetooth.scan.none_found')}</p>
                </div>
              ) : (
                sortedDevices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => selectDevice(device)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                      selectedDevice?.id === device.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
                      : 'bg-white dark:bg-slate-900 border-gray-50 dark:border-slate-800 hover:border-blue-100 dark:hover:border-blue-900/30 shadow-sm'
                    }`}
                  >
                    <div className={`p-3 rounded-xl transition-colors ${
                      selectedDevice?.id === device.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-500'
                    }`}>
                      <Smartphone size={20} />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{device.name}</p>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-0.5">
                        {t('bluetooth.scan.paired_status')}
                      </p>
                    </div>
                    {selectedDevice?.id === device.id && (
                      <CheckCircle2 size={20} className="text-blue-500" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-4">
            <AlertCircle className="text-blue-500 shrink-0" size={20} />
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed font-medium">
              {t('bluetooth.scan.advice')}
            </p>
          </div>
        </div>

        {/* Right Column: Multimedia Controls */}
        <div className="lg:col-span-7">
          <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl p-8 min-h-[500px] flex flex-col justify-between">
            
            {/* Background Decorative Gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/20 blur-[100px] rounded-full -mr-20 -mt-20 z-0" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 dark:bg-purple-500/20 blur-[100px] rounded-full -ml-20 -mb-20 z-0" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {t('bluetooth.controls.title')}
                </h2>
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700">
                  <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {isSyncing ? 'SYNC' : 'READY'}
                  </span>
                </div>
              </div>

              {selectedDevice ? (
                <div className="flex flex-col items-center py-8">
                  <div className="relative group mb-8">
                    <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full scale-50 group-hover:scale-100 transition-transform duration-700" />
                    <div className="relative w-48 h-48 rounded-[3rem] bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 overflow-hidden transform group-hover:scale-105 transition-transform duration-500">
                      <Music size={80} className="text-white/20 absolute bottom-4 right-4" />
                      <Bluetooth size={64} className="text-white animate-bounce-slow" />
                    </div>
                  </div>
                  
                  <div className="text-center mb-12">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                      {mediaState.title || selectedDevice.name}
                    </h3>
                    <p className="text-sm font-bold text-blue-500 uppercase tracking-widest">
                      {mediaState.artist || t('bluetooth.controls.now_playing')}
                    </p>
                    {mediaState.status !== 'NONE' && (
                       <div className="mt-2 flex items-center justify-center gap-2">
                          <span className="text-[10px] font-black bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-md border border-blue-500/20 uppercase">
                            {mediaState.status}
                          </span>
                       </div>
                    )}
                  </div>

                  {/* Playback Buttons */}
                  <div className="flex items-center gap-6 mb-12">
                    <button 
                      onClick={() => sendCommand('prev')}
                      className="p-5 rounded-3xl bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-500 transition-all active:scale-90"
                    >
                      <SkipBack size={28} fill="currentColor" />
                    </button>
                    <button 
                      onClick={() => sendCommand('play_pause')}
                      className="p-8 rounded-[2rem] bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all active:scale-95"
                    >
                      {mediaState.status === 'PLAYING' ? (
                        <Pause size={36} fill="white" />
                      ) : (
                        <Play size={36} fill="white" />
                      )}
                    </button>
                    <button 
                      onClick={() => sendCommand('next')}
                      className="p-5 rounded-3xl bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-500 transition-all active:scale-90"
                    >
                      <SkipForward size={28} fill="currentColor" />
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="w-full max-w-sm px-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Volume2 size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">{t('bluetooth.controls.volume')}</span>
                      </div>
                      <span className="text-lg font-black text-blue-500">{volume}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value))}
                      onMouseUp={() => sendCommand('volume', volume)}
                      className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-24 h-24 rounded-full bg-gray-50 dark:bg-slate-800/50 flex items-center justify-center mb-6">
                    <Bluetooth size={40} className="text-slate-300 dark:text-slate-700" />
                  </div>
                  <p className="text-slate-400 font-medium max-w-[200px]">
                    {t('bluetooth.controls.select_device')}
                  </p>
                </div>
              )}
            </div>

            {/* Error Banner (Red Alert requested) */}
            {error && (
              <div className="mt-8 animate-in slide-in-from-bottom duration-500 bg-red-500 p-6 rounded-[2rem] text-white shadow-2xl shadow-red-500/20">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">{error.title}</h4>
                    <p className="text-white/80 text-sm font-medium leading-relaxed">{error.detail}</p>
                  </div>
                  <button 
                    onClick={() => setError(null)}
                    className="ml-auto p-2 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 4px solid white;
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
}
