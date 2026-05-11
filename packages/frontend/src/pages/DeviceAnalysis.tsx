import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Battery, MousePointerClick, RefreshCw, Move, Database, Check } from 'lucide-react';
const API_URL = 'http://localhost:3000';

interface BluetoothDevice {
  handle: string;
  id: string;
  name: string;
}

interface AnalysisData {
  clicks: number;
  clicksPerMin: number;
  distance: number;
  battery: number | null;
}

interface MouseActions {
  leftClick: boolean;
  rightClick: boolean;
  middleClick: boolean;
  scrollUp: boolean;
  scrollDown: boolean;
  moveUp: boolean;
  moveDown: boolean;
  moveLeft: boolean;
  moveRight: boolean;
}

const EMPTY_ACTIONS: MouseActions = {
  leftClick: false, rightClick: false, middleClick: false,
  scrollUp: false, scrollDown: false,
  moveUp: false, moveDown: false, moveLeft: false, moveRight: false,
};

// ─── SVG Mouse Visualizer ──────────────────────────────────────────────
function MouseVisualizer({ actions }: { actions: MouseActions }) {
  const anyActive = Object.values(actions).some(Boolean);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Directional arrows */}
      <Arrow dir="up"    active={actions.moveUp}    />
      <Arrow dir="down"  active={actions.moveDown}  />
      <Arrow dir="left"  active={actions.moveLeft}  />
      <Arrow dir="right" active={actions.moveRight} />

      {/* Scroll indicators */}
      <ScrollIndicator dir="up"   active={actions.scrollUp} />
      <ScrollIndicator dir="down" active={actions.scrollDown} />

      {/* Mouse body */}
      <svg viewBox="0 0 120 180" width={100} height={150} className="drop-shadow-lg">
        {/* Body outline */}
        <rect x="10" y="50" width="100" height="120" rx="50" ry="50"
          className="fill-slate-800 dark:fill-slate-700 stroke-slate-600 dark:stroke-slate-500"
          strokeWidth="2"
        />
        {/* Top shell */}
        <path d="M10,80 Q10,10 60,10 Q110,10 110,80 L110,90 L10,90 Z"
          className="fill-slate-700 dark:fill-slate-600 stroke-slate-600 dark:stroke-slate-500"
          strokeWidth="2"
        />

        {/* Left button */}
        <path d="M14,80 Q14,16 58,14 L58,88 L14,88 Z"
          className={`transition-all duration-75 stroke-slate-500 ${
            actions.leftClick
              ? 'fill-[#A855F7] opacity-100'
              : 'fill-slate-600 dark:fill-slate-500 opacity-60'
          }`}
          strokeWidth="1"
        />

        {/* Right button */}
        <path d="M106,80 Q106,16 62,14 L62,88 L106,88 Z"
          className={`transition-all duration-75 stroke-slate-500 ${
            actions.rightClick
              ? 'fill-[#EC4899] opacity-100'
              : 'fill-slate-600 dark:fill-slate-500 opacity-60'
          }`}
          strokeWidth="1"
        />

        {/* Divider line */}
        <line x1="60" y1="14" x2="60" y2="88"
          className="stroke-slate-800 dark:stroke-slate-700" strokeWidth="2"
        />

        {/* Middle button / scroll wheel */}
        <rect x="52" y="32" width="16" height="28" rx="8"
          className={`transition-all duration-75 stroke-slate-400 ${
            actions.middleClick
              ? 'fill-amber-400 opacity-100'
              : 'fill-slate-400 dark:fill-slate-300 opacity-50'
          }`}
          strokeWidth="1"
        />
        {/* Scroll wheel lines */}
        <line x1="57" y1="40" x2="63" y2="40" className="stroke-slate-600" strokeWidth="1" opacity="0.5" />
        <line x1="57" y1="46" x2="63" y2="46" className="stroke-slate-600" strokeWidth="1" opacity="0.5" />
        <line x1="57" y1="52" x2="63" y2="52" className="stroke-slate-600" strokeWidth="1" opacity="0.5" />

        {/* Glow effect on press */}
        {actions.leftClick && (
          <circle cx="36" cy="50" r="18" fill="#A855F7" opacity="0.25">
            <animate attributeName="r" from="14" to="24" dur="0.3s" repeatCount="1" />
            <animate attributeName="opacity" from="0.4" to="0" dur="0.3s" repeatCount="1" />
          </circle>
        )}
        {actions.rightClick && (
          <circle cx="84" cy="50" r="18" fill="#EC4899" opacity="0.25">
            <animate attributeName="r" from="14" to="24" dur="0.3s" repeatCount="1" />
            <animate attributeName="opacity" from="0.4" to="0" dur="0.3s" repeatCount="1" />
          </circle>
        )}
      </svg>

      {/* Subtle pulse ring when any action is active */}
      {anyActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-32 h-40 rounded-full border-2 border-[#A855F7]/20 animate-ping" />
        </div>
      )}
    </div>
  );
}

// ─── Arrow Component ───────────────────────────────────────────────────
function Arrow({ dir, active }: { dir: 'up' | 'down' | 'left' | 'right'; active: boolean }) {
  const positions: Record<string, string> = {
    up:    'top-0 left-1/2 -translate-x-1/2',
    down:  'bottom-0 left-1/2 -translate-x-1/2',
    left:  'left-0 top-1/2 -translate-y-1/2',
    right: 'right-0 top-1/2 -translate-y-1/2',
  };
  const rotations: Record<string, string> = {
    up: 'rotate-0', down: 'rotate-180', left: '-rotate-90', right: 'rotate-90',
  };

  return (
    <div className={`absolute ${positions[dir]} transition-all duration-100 ${active ? 'opacity-100 scale-110' : 'opacity-15 scale-90'}`}>
      <svg viewBox="0 0 24 24" width={28} height={28} className={rotations[dir]}>
        <path d="M12 4 L4 14 L9 14 L9 20 L15 20 L15 14 L20 14 Z"
          className={`transition-colors duration-75 ${active ? 'fill-blue-400' : 'fill-slate-500'}`}
        />
      </svg>
    </div>
  );
}

// ─── Scroll Indicator ──────────────────────────────────────────────────
function ScrollIndicator({ dir, active }: { dir: 'up' | 'down'; active: boolean }) {
  const isUp = dir === 'up';
  return (
    <div className={`absolute ${isUp ? 'top-8 right-4' : 'bottom-8 right-4'} transition-all duration-100 ${
      active ? 'opacity-100 scale-110' : 'opacity-0 scale-75'
    }`}>
      <div className={`flex flex-col items-center gap-0.5 ${active ? 'animate-bounce' : ''}`}>
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <path d={isUp ? "M12 4 L4 14 L20 14 Z" : "M12 20 L4 10 L20 10 Z"}
            className="fill-amber-400"
          />
        </svg>
        <span className="text-[10px] font-bold text-amber-400">SCROLL</span>
      </div>
    </div>
  );
}

// ─── Action Labels ────────────────────────────────────────────────────
function ActionLabels({ actions }: { actions: MouseActions }) {
  const { t } = useTranslation();
  const labels: { key: keyof MouseActions; label: string; color: string }[] = [
    { key: 'leftClick',   label: t('analysis.actions.left'), color: 'bg-[#A855F7]/20 text-[#A855F7]' },
    { key: 'rightClick',  label: t('analysis.actions.right'),   color: 'bg-[#EC4899]/20 text-[#EC4899]' },
    { key: 'middleClick', label: t('analysis.actions.middle'),   color: 'bg-amber-400/20 text-amber-400' },
    { key: 'scrollUp',    label: t('analysis.actions.scroll_up'),        color: 'bg-amber-400/20 text-amber-400' },
    { key: 'scrollDown',  label: t('analysis.actions.scroll_down'),  color: 'bg-amber-400/20 text-amber-400' },
    { key: 'moveUp',      label: t('analysis.actions.move_up'),         color: 'bg-blue-400/20 text-blue-400' },
    { key: 'moveDown',    label: t('analysis.actions.move_down'),    color: 'bg-blue-400/20 text-blue-400' },
    { key: 'moveLeft',    label: t('analysis.actions.move_left'),    color: 'bg-blue-400/20 text-blue-400' },
    { key: 'moveRight',   label: t('analysis.actions.move_right'),   color: 'bg-blue-400/20 text-blue-400' },
  ];

  const activeLabels = labels.filter(l => actions[l.key]);

  return (
    <div className="flex flex-wrap gap-2 justify-center min-h-[32px]">
      {activeLabels.length === 0 ? (
        <span className="text-sm text-slate-500 italic">{t('analysis.actions.no_activity')}</span>
      ) : (
        activeLabels.map(l => (
          <span key={l.key} className={`px-3 py-1 rounded-full text-xs font-bold ${l.color} transition-all animate-in fade-in zoom-in duration-150`}>
            {l.label}
          </span>
        ))
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════
export default function DeviceAnalysis() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null);
  
  const [data, setData] = useState<AnalysisData>({
    clicks: 0, clicksPerMin: 0, distance: 0, battery: null
  });

  const [mouseActions, setMouseActions] = useState<MouseActions>({ ...EMPTY_ACTIONS });
  const actionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [batteryStatus, setBatteryStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [isSaved, setIsSaved] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const clickTimesRef = useRef<number[]>([]);

  // Flash an action on for a short duration, then auto-clear
  const flashAction = useCallback((key: keyof MouseActions, durationMs = 250) => {
    setMouseActions(prev => ({ ...prev, [key]: true }));
    if (actionTimers.current[key]) clearTimeout(actionTimers.current[key]);
    actionTimers.current[key] = setTimeout(() => {
      setMouseActions(prev => ({ ...prev, [key]: false }));
    }, durationMs);
  }, []);

  useEffect(() => {
    fetchDevices();
    return () => stopSniffing();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      clickTimesRef.current = clickTimesRef.current.filter(time => now - time < 60000);
      setData(prev => ({ ...prev, clicksPerMin: clickTimesRef.current.length }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/devices/analysis/mice`);
      const json = await res.json();
      if (json.devices) setDevices(json.devices);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBattery = async (id: string) => {
    setBatteryStatus('loading');
    try {
      const res = await fetch(`${API_URL}/devices/analysis/battery/${encodeURIComponent(id)}`);
      const json = await res.json();
      if (json.battery !== undefined && json.battery !== null) {
        setData(prev => ({ ...prev, battery: json.battery }));
        setBatteryStatus('ok');
      } else {
        setBatteryStatus('error');
      }
    } catch (err) {
      console.error("No se pudo obtener la batería", err);
      setBatteryStatus('error');
    }
  };

  const startSniffing = (device: BluetoothDevice) => {
    stopSniffing();
    setSelectedDevice(device);
    
    setData({ clicks: 0, clicksPerMin: 0, distance: 0, battery: null });
    setMouseActions({ ...EMPTY_ACTIONS });
    clickTimesRef.current = [];
    setBatteryStatus('loading');
    
    fetchBattery(device.id);

    const es = new EventSource(`${API_URL}/devices/analysis/stream/${device.handle}?id=${encodeURIComponent(device.id)}`);
    
    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.event === 'click') {
          setData(prev => ({ ...prev, clicks: prev.clicks + 1 }));
          clickTimesRef.current.push(Date.now());
          if (payload.button === 'left')   flashAction('leftClick');
          if (payload.button === 'right')  flashAction('rightClick');
          if (payload.button === 'middle') flashAction('middleClick');
        } else if (payload.event === 'move') {
          const dist = Math.sqrt(payload.x * payload.x + payload.y * payload.y);
          setData(prev => ({ ...prev, distance: prev.distance + dist }));
          if (payload.y < -2) flashAction('moveUp', 150);
          if (payload.y > 2)  flashAction('moveDown', 150);
          if (payload.x < -2) flashAction('moveLeft', 150);
          if (payload.x > 2)  flashAction('moveRight', 150);
        } else if (payload.event === 'scroll') {
          if (payload.direction === 'up')   flashAction('scrollUp', 300);
          if (payload.direction === 'down') flashAction('scrollDown', 300);
        }
      } catch (err) {
        // Ignore parsing errors
      }
    };

    es.onerror = () => {
      console.log("Conexión SSE cerrada o error");
      es.close();
    };

    eventSourceRef.current = es;
  };

  const stopSniffing = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    // Clear all action timers
    Object.values(actionTimers.current).forEach(clearTimeout);
    actionTimers.current = {};
    setMouseActions({ ...EMPTY_ACTIONS });
  };

  const saveDeviceToDB = async () => {
    if (!selectedDevice) return;
    try {
      await fetch(`${API_URL}/devices/bluetooth/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedDevice.name || t('common.generic') + ' Bluetooth', id: selectedDevice.id, type: 'bluetooth-mouse' })
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">
            {t('analysis.title')}
          </h1>
          <p className="text-slate-500 mt-2">
            {t('analysis.subtitle')}
          </p>
        </div>
        <button
          onClick={fetchDevices}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          disabled={loading}
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          <span>{t('analysis.refresh')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="text-[#A855F7]" />
              {t('analysis.devices_title')}
            </h2>
            
            {devices.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {loading ? t('analysis.scanning_kernel') : t('analysis.no_mice')}
              </div>
            ) : (
              <ul className="space-y-3">
                {devices.map(d => (
                  <li key={d.id}>
                    <button
                      onClick={() => selectedDevice?.id === d.id ? stopSniffing() : startSniffing(d)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedDevice?.id === d.id 
                          ? 'border-[#A855F7] bg-[#A855F7]/10 ring-2 ring-[#A855F7]/20' 
                          : 'border-slate-200 dark:border-slate-800 hover:border-[#A855F7]/50'
                      }`}
                    >
                      <div className="font-semibold text-sm truncate">{d.name || d.id}</div>
                      <div className="text-xs text-slate-500 mt-1 truncate">MAC: {d.id}</div>
                      {selectedDevice?.id === d.id && (
                        <div className="mt-2 text-xs font-medium text-[#A855F7] flex items-center gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A855F7] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A855F7]"></span>
                          </span>
                          {t('analysis.sniffing_active')}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2">
          {selectedDevice ? (
            <>
              <div className="flex items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="min-w-0 flex-1">
                   <h3 className="font-bold text-lg truncate">{selectedDevice.name}</h3>
                   <p className="text-sm text-slate-500 truncate">MAC: {selectedDevice.id}</p>
                </div>
                <button
                  onClick={saveDeviceToDB}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                    isSaved 
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' 
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40'
                  }`}
                >
                  {isSaved ? <Check size={16} /> : <Database size={16} />}
                  {isSaved ? t('analysis.added') : t('analysis.save_db')}
                </button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                {/* Battery */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-[#A855F7]/50 transition-colors">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Battery size={80} />
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Battery size={18} className="text-emerald-500" />
                    <span className="font-medium text-sm">{t('analysis.battery')}</span>
                  </div>
                  <div className="text-3xl font-extrabold flex items-baseline gap-1">
                    {batteryStatus === 'ok' ? data.battery : '--'}
                    <span className="text-base text-slate-400 font-medium">%</span>
                  </div>
                  {batteryStatus === 'loading' && (
                    <p className="text-xs text-blue-500 mt-1 animate-pulse">{t('analysis.querying_pnp')}</p>
                  )}
                  {batteryStatus === 'error' && (
                    <p className="text-xs text-red-400 mt-1">{t('analysis.not_reported')}</p>
                  )}
                </div>

                {/* APM */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-[#EC4899]/50 transition-colors">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <MousePointerClick size={80} />
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <MousePointerClick size={18} className="text-[#EC4899]" />
                    <span className="font-medium text-sm">{t('analysis.apm')}</span>
                  </div>
                  <div className="text-3xl font-extrabold flex items-baseline gap-1">
                    {data.clicksPerMin}
                    <span className="text-base text-slate-400 font-medium">{t('analysis.clicks_min')}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{t('devices_page.total', { count: data.clicks })}</p>
                </div>

                {/* Distance */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Move size={80} />
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Move size={18} className="text-blue-500" />
                    <span className="font-medium text-sm">{t('analysis.distance')}</span>
                  </div>
                  <div className="text-3xl font-extrabold flex items-baseline gap-1">
                    {(data.distance / 1000).toFixed(2)}
                    <span className="text-base text-slate-400 font-medium">kpx</span>
                  </div>
                </div>
              </div>

              {/* Live Mouse Visualizer */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 text-slate-500 mb-4">
                  <Activity size={20} className="text-amber-500" />
                  <span className="font-medium">{t('analysis.live_activity')}</span>
                </div>
                <div className="flex flex-col items-center gap-6">
                  <MouseVisualizer actions={mouseActions} />
                  <ActionLabels actions={mouseActions} />
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl min-h-[400px]">
              <MousePointerClick size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('analysis.select_device')}</p>
              <p className="text-sm">{t('analysis.start_capture')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
