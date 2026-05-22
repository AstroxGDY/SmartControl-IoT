import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Bluetooth, Smartphone, Volume2, Play, Pause, 
  SkipForward, SkipBack, Loader2, AlertCircle, RefreshCw,
  Search, CheckCircle2, Music, MousePointer2, Activity, Move,
  ArrowUp, ArrowDown, ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BTDevice {
  name: string;
  id: string;
  state: number; // 1: Active, 8: Unplugged
}

interface PeripheralDevice {
  handle: string;
  id: string;
  name: string;
}

interface MouseEvent {
  event: 'click' | 'move' | 'scroll';
  button?: string;
  direction?: string;
  x?: number;
  y?: number;
  force?: number;
}

export default function BluetoothManager() {
  const { t } = useTranslation();
  
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BTDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BTDevice | null>(null);
  const [volume, setVolume] = useState(50);
  const [mediaState, setMediaState] = useState<{ status: string; title: string; artist: string }>({
    status: 'NONE',
    title: '',
    artist: ''
  });
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'peripherals'>('audio');
  
  // Peripherals state
  const [peripheralDevices, setPeripheralDevices] = useState<PeripheralDevice[]>([]);
  const [selectedPeripheral, setSelectedPeripheral] = useState<PeripheralDevice | null>(null);
  const [isScanningPeripherals, setIsScanningPeripherals] = useState(false);
  const [lastEvent, setLastEvent] = useState<MouseEvent | null>(null);
  const [activeButtons, setActiveButtons] = useState<{ [key: string]: boolean }>({ left: false, right: false, middle: false });
  const [activeMove, setActiveMove] = useState<{ x: number, y: number, timestamp: number } | null>(null);
  const [sessionStats, setSessionStats] = useState({ clicks: 0, distance: 0 });

  const hasMounted = useRef(false);

  const fetchState = async (deviceId?: string, deviceName?: string) => {
    try {
      const targetId = deviceId || selectedDevice?.id;
      const targetName = deviceName || selectedDevice?.name;
      
      const query = new URLSearchParams();
      if (targetId) query.append('deviceId', targetId);
      if (targetName) query.append('deviceName', targetName);

      const response = await fetch(`http://localhost:3000/devices/bluetooth/state?${query.toString()}`);
      const data = await response.json();
      if (data.success) {
        setMediaState({
          status: data.status,
          title: data.title,
          artist: data.artist
        });
        
        // Sincronizamos volumen desde el hardware
        if (typeof data.volume === 'number') {
          setVolume(data.volume);
        }
      }
    } catch (e) {
      console.warn("Error polling state", e);
    }
  };

  // Poller de estado cada 3 segundos
  useEffect(() => {
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
      // 1. Prioridad: Dispositivos CONECTADOS (state 1)
      if (a.state === 1 && b.state !== 1) return -1;
      if (b.state === 1 && a.state !== 1) return 1;
      
      // 2. Alfabético por nombre
      return a.name.localeCompare(b.name);
    });
  }, [devices]);

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
      
      // Actualizamos estado inmediatamente para mayor feedback visual
      if (['play_pause', 'next', 'prev'].includes(command)) {
        await fetchState();
      }

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
    if (device.state === 8) {
      // Si está desconectado, intentamos conectar
      setIsSyncing(true);
      setError(null);
      try {
        const response = await fetch('http://localhost:3000/devices/bluetooth/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: device.id })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Fallo de conexión');
        
        // Si tiene éxito, refrescamos la lista
        await scanDevices();
      } catch (err: any) {
        setError({
          title: t('bluetooth.controls.hardware_error'),
          detail: err.message
        });
        return;
      } finally {
        setIsSyncing(false);
      }
    }

    setSelectedDevice(device);
    // Persistimos en la BD
    try {
      // Sincronizamos volumen inicial inmediatamente
      await fetchState(device.id, device.name);
      
      await fetch('http://localhost:3000/devices/bluetooth/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: device.name, id: device.id })
      });
    } catch (e) {
      console.error("Error persistiendo device", e);
    }
  };

  // Peripheral Logic
  const scanPeripherals = async () => {
    setIsScanningPeripherals(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/devices/analysis/mice');
      const data = await response.json();
      if (data.devices) {
        setPeripheralDevices(data.devices);
      }
    } catch (err: any) {
      setError({ title: 'Error de escaneo', detail: err.message });
    } finally {
      setIsScanningPeripherals(false);
    }
  };

  const selectPeripheralDevice = async (device: PeripheralDevice) => {
    console.log("Selected Peripheral:", device);
    setSelectedPeripheral(device);
    setSessionStats({ clicks: 0, distance: 0 });
    try {
      const resp = await fetch('http://localhost:3000/devices/bluetooth/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: device.name, id: device.id, type: 'peripheral-device' })
      });
      console.log("Pair response:", await resp.json());
    } catch (e) {
      console.error("Error pairing peripheral", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'peripherals' && !hasMounted.current) {
        scanPeripherals();
    }
  }, [activeTab]);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    if (selectedPeripheral) {
      const url = `http://localhost:3000/devices/analysis/stream/${selectedPeripheral.handle}?id=${selectedPeripheral.id}`;
      eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent(data);
          
          if (data.event === 'click' && data.button) {
            setSessionStats(prev => ({ ...prev, clicks: prev.clicks + 1 }));
            setActiveButtons(prev => ({ ...prev, [data.button!]: true }));
            setTimeout(() => {
                setActiveButtons(prev => ({ ...prev, [data.button!]: false }));
            }, 150);
          } else if (data.event === 'move') {
            const d = Math.sqrt(data.x * data.x + data.y * data.y);
            setSessionStats(prev => ({ ...prev, distance: prev.distance + d }));
            setActiveMove({ x: data.x, y: data.y, timestamp: Date.now() });
          } else if (data.event === 'scroll') {
             // Scroll visual feedback is handled via lastEvent
          }
        } catch (e) {
          console.error("Error parsing SSE", e);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE Error", err);
        eventSource?.close();
      };
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [selectedPeripheral]);

  useEffect(() => {
    if (activeMove) {
      const timer = setTimeout(() => {
        setActiveMove(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeMove]);

  return (
    <div className="min-h-full bg-[#F5F7FF] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Header */}
      <header className="p-6 md:p-8 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 border-b border-gray-100 dark:border-white/5">
        <div className="flex bg-gray-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'audio' 
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {t('bluetooth.tabs.audio', 'Audio')}
          </button>
          <button
            onClick={() => setActiveTab('peripherals')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'peripherals' 
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {t('bluetooth.tabs.peripherals', 'Periféricos')}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center">
            <Bluetooth size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-300 uppercase">
            {activeTab === 'audio' ? 'Windows Audio' : 'HID Analysis'}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Scanner & Device List */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Search size={20} className="text-blue-500" />
                {activeTab === 'audio' ? t('bluetooth.scan.title') : 'Escanear Periféricos'}
              </h2>
              <button 
                onClick={activeTab === 'audio' ? scanDevices : scanPeripherals}
                disabled={activeTab === 'audio' ? isScanning : isScanningPeripherals}
                className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-400 transition-all hover:rotate-180 duration-500"
              >
                <RefreshCw size={18} className={(activeTab === 'audio' ? isScanning : isScanningPeripherals) ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {activeTab === 'audio' ? (
                isScanning ? (
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
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group overflow-hidden relative ${
                        device.state === 1 
                        ? (selectedDevice?.id === device.id 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50' 
                            : 'bg-white dark:bg-slate-900 border-gray-50 dark:border-slate-800 hover:border-blue-100 dark:hover:border-blue-900/30')
                        : 'bg-gray-50/50 dark:bg-slate-900/30 border-transparent dark:border-transparent opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'
                      }`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${device.state === 1 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                      <div className={`p-3 rounded-xl transition-colors ${device.state === 1 ? (selectedDevice?.id === device.id ? 'bg-blue-500 text-white' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-500') : 'bg-gray-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Smartphone size={20} />
                      </div>
                      <div className="flex-1 truncate">
                        <p className={`font-bold truncate ${device.state === 1 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>{device.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded ${device.state === 1 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-gray-200 dark:bg-slate-800 text-slate-500'}`}>
                            {device.state === 1 ? t('bluetooth.scan.connected') : t('bluetooth.scan.disconnected')}
                          </span>
                        </div>
                      </div>
                      {isSyncing && !selectedDevice && device.state === 8 && <Loader2 size={16} className="animate-spin text-blue-500" />}
                      {selectedDevice?.id === device.id && device.state === 1 && <CheckCircle2 size={20} className="text-blue-500" />}
                    </button>
                  ))
                )
              ) : (
                /* Peripherals List */
                isScanningPeripherals ? (
                  <div className="flex flex-col items-center py-12 text-slate-400">
                    <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
                    <p className="text-sm font-medium animate-pulse">Buscando mouses...</p>
                  </div>
                ) : peripheralDevices.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-2xl">
                    <MousePointer2 size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm text-slate-400">No se encontraron periféricos RAWINPUT</p>
                  </div>
                ) : (
                  peripheralDevices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => selectPeripheralDevice(device)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group overflow-hidden relative ${
                        selectedPeripheral?.id === device.id 
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50' 
                          : 'bg-white dark:bg-slate-900 border-gray-50 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900/30'
                      }`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${selectedPeripheral?.id === device.id ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                      <div className={`p-3 rounded-xl transition-colors ${selectedPeripheral?.id === device.id ? 'bg-indigo-500 text-white' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500'}`}>
                        <MousePointer2 size={20} />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="font-bold truncate text-slate-700 dark:text-slate-200">{device.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{device.id}</p>
                      </div>
                      {selectedPeripheral?.id === device.id && <Activity size={18} className="text-indigo-500 animate-pulse" />}
                    </button>
                  ))
                )
              )}
            </div>
          </div>

          <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-4">
            <AlertCircle className="text-blue-500 shrink-0" size={20} />
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed font-medium">
              {activeTab === 'audio' ? t('bluetooth.scan.advice') : 'La detección de periféricos usa RAWINPUT para capturar eventos directamente del hardware.'}
            </p>
          </div>
        </div>

        {/* Right Column: Controls & Tracking */}
        <div className="lg:col-span-7">
          <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl p-8 min-h-[500px] flex flex-col justify-between">
            
            {activeTab === 'audio' ? (
              /* Multimedia Controls */
              <>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/20 blur-[100px] rounded-full -mr-20 -mt-20 z-0" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 dark:bg-purple-500/20 blur-[100px] rounded-full -ml-20 -mb-20 z-0" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-12">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{t('bluetooth.controls.title')}</h2>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-gray-200 dark:border-slate-700">
                      <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{isSyncing ? 'SYNC' : 'READY'}</span>
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
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">{mediaState.title || selectedDevice.name}</h3>
                        <p className="text-sm font-bold text-blue-500 uppercase tracking-widest">{mediaState.artist || t('bluetooth.controls.now_playing')}</p>
                      </div>
                      <div className="flex items-center gap-6 mb-12">
                        <button onClick={() => sendCommand('prev')} className="p-5 rounded-3xl bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-500 transition-all active:scale-90"><SkipBack size={28} fill="currentColor" /></button>
                        <button onClick={() => sendCommand('play_pause')} className="p-8 rounded-[2rem] bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all active:scale-95">{mediaState.status === 'PLAYING' ? <Pause size={36} fill="white" /> : <Play size={36} fill="white" />}</button>
                        <button onClick={() => sendCommand('next')} className="p-5 rounded-3xl bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-500 transition-all active:scale-90"><SkipForward size={28} fill="currentColor" /></button>
                      </div>
                      <div className="w-full max-w-sm px-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-slate-400"><Volume2 size={18} /><span className="text-xs font-bold uppercase tracking-wider">{t('bluetooth.controls.volume')}</span></div>
                          <span className="text-lg font-black text-blue-500">{volume}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(parseInt(e.target.value))} onMouseUp={() => sendCommand('volume', volume)} className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="w-24 h-24 rounded-full bg-gray-50 dark:bg-slate-800/50 flex items-center justify-center mb-6"><Bluetooth size={40} className="text-slate-300 dark:text-slate-700" /></div>
                      <p className="text-slate-400 font-medium max-w-[200px]">{t('bluetooth.controls.select_device')}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Peripheral Visual Tracker */
              <>
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/20 blur-[100px] rounded-full -mr-20 -mt-20 z-0" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Analisis Visual</h2>
                    <div className="flex gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Clicks</p>
                        <p className="text-xl font-black text-indigo-500">{sessionStats.clicks}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distance</p>
                        <p className="text-xl font-black text-blue-500">{Math.round(sessionStats.distance / 100)}m</p>
                      </div>
                    </div>
                  </div>

                  {selectedPeripheral ? (
                    <div className="flex-1 flex items-center justify-center gap-20 relative py-12">
                      {/* Visual Mouse Indicator (Left) */}
                      <div className="relative z-10">
                        {/* Ripple for clicks */}
                        {activeButtons.left && (
                          <div className="mouse-ripple bg-indigo-500 -left-8" style={{ top: '20%' }} />
                        )}
                        {activeButtons.right && (
                          <div className="mouse-ripple bg-purple-500 -right-8" style={{ top: '20%' }} />
                        )}
                        {activeButtons.middle && (
                          <div className="mouse-ripple bg-emerald-500 left-1/2 -translate-x-1/2" style={{ top: '20%' }} />
                        )}

                        <div className={`w-40 h-64 rounded-[4rem] border-4 transition-all duration-300 flex flex-col items-center p-4 relative bg-white dark:bg-slate-900 shadow-2xl ${
                          (activeButtons.left || activeButtons.right || activeButtons.middle) ? 'scale-95 border-indigo-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                        style={{ transform: activeMove ? `translate(${Math.min(Math.max(activeMove.x, -10), 10)}px, ${Math.min(Math.max(activeMove.y, -10), 10)}px)` : 'none' }}
                        >
                          {/* Mouse Buttons */}
                          <div className="w-full h-24 flex gap-1 mb-4">
                            <div className={`flex-1 rounded-tl-[3.5rem] rounded-tr-md transition-colors duration-100 ${activeButtons.left ? 'bg-indigo-500' : 'bg-slate-50 dark:bg-slate-800'}`} />
                            <div className="w-1 h-full bg-slate-100 dark:bg-slate-800/50" />
                            <div className={`flex-1 rounded-tr-[3.5rem] rounded-tl-md transition-colors duration-100 ${activeButtons.right ? 'bg-indigo-500' : 'bg-slate-50 dark:bg-slate-800'}`} />
                          </div>
                          {/* Scroll Wheel */}
                          <div className={`w-3 h-10 rounded-full transition-all duration-300 absolute top-12 left-1/2 -translate-x-1/2 ${
                            lastEvent?.event === 'scroll' ? 'bg-indigo-500 scale-y-125' : 'bg-slate-200 dark:bg-slate-700'
                          }`}>
                            {lastEvent?.event === 'scroll' && (
                              <div className={`absolute left-1/2 -translate-x-1/2 ${lastEvent.direction === 'up' ? '-top-6' : '-bottom-6'}`}>
                                <Move size={12} className={lastEvent.direction === 'up' ? 'rotate-0' : 'rotate-180'} />
                              </div>
                            )}
                          </div>
                          
                          {/* Bottom part of mouse (Empty now as requested) */}
                          <div className="mt-auto mb-8">
                             <div className="w-12 h-1 bg-gray-100 dark:bg-slate-800 rounded-full opacity-50" />
                          </div>
                        </div>
                      </div>

                      {/* Movement Arrows Pad (Right) */}
                      <div className="flex flex-col items-center gap-4 bg-gray-50/50 dark:bg-slate-900/50 p-8 rounded-[3rem] border border-gray-100 dark:border-slate-800 shadow-inner">
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700">
                           <ArrowUp size={32} className={`transition-all duration-200 ${activeMove && activeMove.y < 0 ? 'text-indigo-500 scale-125 opacity-100 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-300 dark:text-slate-600 opacity-30'}`} />
                        </div>
                        <div className="flex gap-4">
                           <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700">
                              <ArrowLeft size={32} className={`transition-all duration-200 ${activeMove && activeMove.x < 0 ? 'text-indigo-500 scale-125 opacity-100 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-300 dark:text-slate-600 opacity-30'}`} />
                           </div>
                           <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700">
                              <ArrowRight size={32} className={`transition-all duration-200 ${activeMove && activeMove.x > 0 ? 'text-indigo-500 scale-125 opacity-100 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-300 dark:text-slate-600 opacity-30'}`} />
                           </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700">
                           <ArrowDown size={32} className={`transition-all duration-200 ${activeMove && activeMove.y > 0 ? 'text-indigo-500 scale-125 opacity-100 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-300 dark:text-slate-600 opacity-30'}`} />
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 w-full text-center">
                           <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">
                              <Activity size={12} className="animate-pulse" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6">
                        <MousePointer2 size={40} className="text-indigo-500" />
                      </div>
                      <p className="text-slate-400 font-medium max-w-[200px]">Selecciona un periférico para iniciar el análisis en tiempo real</p>
                    </div>
                  )}
                </div>
              </>
            )}
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
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
        .mouse-ripple {
          position: absolute;
          width: 8rem;
          height: 8rem;
          border-radius: 9999px;
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
          opacity: 0.2;
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
