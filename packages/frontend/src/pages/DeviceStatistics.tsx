import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    BarChart, 
    Battery, 
    Zap, 
    Clock, 
    Smartphone, 
    Database, 
    ChevronRight, 
    Activity, 
    TrendingUp,
    AlertCircle,
    Info,
    Cpu,
    Loader2,
    Wifi,
    PowerOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    AreaChart, 
    Area 
} from 'recharts';

const API_URL = 'http://localhost:3000';

interface DeviceStats {
    totalRecords: number;
    latestStatus: 'online' | 'offline' | 'error';
    latestBattery?: number;
    avgBattery?: number;
}

interface GlobalStatsData {
    device: {
        _id: string;
        name: string;
        type: string;
        image: string;
        connectionType: string;
    };
    stats: DeviceStats;
}

interface HistoryPoint {
    timestamp: string;
    batteryLevel?: number;
    status: string;
}

export default function DeviceStatistics() {
    const { t } = useTranslation();
    const [data, setData] = useState<GlobalStatsData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Detailed view state
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (selectedDeviceId) {
            fetchDeviceHistory(selectedDeviceId);
        }
    }, [selectedDeviceId]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/stats/global`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
                // Select first device if available
                if (json.data.length > 0 && !selectedDeviceId) {
                    setSelectedDeviceId(json.data[0].device._id);
                }
            } else {
                throw new Error(json.error || 'Error al obtener estadísticas');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeviceHistory = async (id: string) => {
        try {
            setIsHistoryLoading(true);
            const res = await fetch(`${API_URL}/stats/${id}`);
            const json = await res.json();
            if (json.success) {
                setHistory(json.data);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-emerald-500';
            case 'offline': return 'bg-slate-400';
            case 'error': return 'bg-red-500';
            default: return 'bg-slate-200';
        }
    };

    const selectedDeviceData = data.find(d => d.device._id === selectedDeviceId);

    // Consumption detection (Tuya)
    const getConsumption = (dps?: any) => {
        if (!dps) return undefined;
        // Common Tuya Power DPs
        const val = dps.cur_power || dps.current_power || dps['19'];
        if (typeof val === 'number') return val / 10; // Usually reported in 0.1W
        return undefined;
    };

    // Chart Formatting
    const chartData = (history || []).map(point => {
        try {
            const date = new Date(point.timestamp);
            if (isNaN(date.getTime())) return null;
            return {
                time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                battery: point.batteryLevel,
                consumption: getConsumption(point.dps),
                fullDate: date.toLocaleString()
            };
        } catch (e) {
            return null;
        }
    }).filter((p): p is { time: string; battery: number | undefined; consumption: number | undefined; fullDate: string } => p !== null);

    const batteryData = chartData.filter(p => p.battery !== undefined);
    const consumptionData = chartData.filter(p => p.consumption !== undefined);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const isConsumption = payload[0].dataKey === 'consumption';
            return (
                <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.fullDate}</p>
                    <p className={`text-sm font-black ${isConsumption ? 'text-amber-500' : 'text-blue-600 dark:text-blue-400'}`}>
                        {isConsumption ? 'Consumo: ' : 'Batería: '}
                        <span className="text-lg">{payload[0].value}{isConsumption ? ' W' : '%'}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-100px)]">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-4 text-slate-800 dark:text-white uppercase tracking-tighter">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <BarChart className="text-white" size={24} />
                        </div>
                        {t('statistics.title', 'Análisis de Datos')}
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">
                        {t('statistics.subtitle', 'Monitorización histórica y métricas de rendimiento IoT')}
                    </p>
                </div>
                
                {/* Global Summary Mini-Cards */}
                {!loading && (
                    <div className="flex gap-3">
                        <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                                <Activity size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Online</p>
                                <p className="text-lg font-black text-slate-700 dark:text-white">{data.filter(d => d.stats.latestStatus === 'online').length}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                <Database size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total</p>
                                <p className="text-lg font-black text-slate-700 dark:text-white">{data.length}</p>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                    <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-full border-4 border-blue-100 dark:border-blue-900/30 border-t-blue-500 animate-spin" />
                        <Database size={32} className="absolute inset-0 m-auto text-blue-500 animate-pulse" />
                    </div>
                    <p className="font-black uppercase tracking-[0.3em] text-xs animate-pulse">Sincronizando analíticas...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/10 text-red-600 p-8 rounded-3xl border border-red-100 dark:border-red-900/30 flex items-center gap-6 max-w-2xl mx-auto shadow-xl">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <AlertCircle size={32} />
                    </div>
                    <div>
                        <h3 className="font-black uppercase text-sm tracking-widest mb-1">Error de conexión</h3>
                        <p className="text-sm opacity-80">{error}</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Master List (Sidebar) */}
                    <aside className="lg:w-80 flex-shrink-0 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">Mis Dispositivos</h3>
                        {data.map(({ device, stats }) => (
                            <button
                                key={device._id}
                                onClick={() => setSelectedDeviceId(device._id)}
                                className={`w-full group flex items-center gap-4 p-4 rounded-[2rem] border transition-all duration-300 text-left ${
                                    selectedDeviceId === device._id
                                        ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-600/20'
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl p-1 shrink-0 relative ${selectedDeviceId === device._id ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                    <img 
                                        src={device.image} 
                                        alt={device.name} 
                                        className="w-full h-full object-contain drop-shadow-sm"
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.svgrepo.com/show/508699/landscape-placeholder.svg' }}
                                    />
                                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 ${selectedDeviceId === device._id ? 'border-blue-600' : 'border-white dark:border-slate-900'} ${getStatusColor(stats.latestStatus)}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-black uppercase truncate tracking-tight ${selectedDeviceId === device._id ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {device.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className={`text-[9px] font-bold uppercase ${selectedDeviceId === device._id ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {device.type}
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight className={`shrink-0 transition-transform ${selectedDeviceId === device._id ? 'text-white rotate-90' : 'text-slate-300'}`} size={16} />
                            </button>
                        ))}
                    </aside>

                    {/* Detail View (Main Content) */}
                    <main className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedDeviceId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4 }}
                                className="space-y-6"
                            >
                                {selectedDeviceData ? (
                                    <>
                                        {/* Device Detail Header */}
                                        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                                                <TrendingUp size={120} />
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row gap-6 sm:items-center justify-between relative z-10">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                                                        <img src={selectedDeviceData.device.image} alt="" className="w-full h-full object-contain drop-shadow-md" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">{selectedDeviceData.device.name}</h2>
                                                            <span className={`w-3 h-3 rounded-full ${getStatusColor(selectedDeviceData.stats.latestStatus)} shadow-[0_0_10px_rgba(16,185,129,0.3)]`} />
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-4">
                                                            <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
                                                                <Smartphone size={12} /> {selectedDeviceData.device.connectionType}
                                                            </span>
                                                            <span className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                                                                <Clock size={12} /> Last Sync: {new Date().toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registros</p>
                                                        <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">{selectedDeviceData.stats.totalRecords}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Charts Section */}
                                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                            {/* Historical Battery Chart */}
                                            <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                                            <TrendingUp size={18} className={consumptionData.length > 0 && batteryData.length === 0 ? "text-amber-500" : "text-blue-500"} />
                                                            {consumptionData.length > 0 && batteryData.length === 0 ? 'Consumo Eléctrico (W)' : 'Nivel de Batería (%)'}
                                                        </h3>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-1">Evolución en las últimas 100 horas</p>
                                                    </div>
                                                    
                                                    {batteryData.length > 0 && selectedDeviceData.stats.avgBattery && (
                                                        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                                                            <span className="text-[9px] font-black text-blue-500 uppercase block leading-none mb-1">Promedio</span>
                                                            <span className="text-lg font-black text-blue-600 dark:text-blue-400">{Math.round(selectedDeviceData.stats.avgBattery)}%</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="h-[350px] w-full">
                                                    {isHistoryLoading ? (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Loader2 size={32} className="text-blue-500 animate-spin" />
                                                        </div>
                                                    ) : (batteryData.length > 0 || consumptionData.length > 0) ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={batteryData.length > 0 ? batteryData : consumptionData}>
                                                                <defs>
                                                                    <linearGradient id="colorBattery" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                                    </linearGradient>
                                                                    <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                                                    </linearGradient>
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                                                <XAxis 
                                                                    dataKey="time" 
                                                                    axisLine={false} 
                                                                    tickLine={false} 
                                                                    tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                                                                    dy={10}
                                                                />
                                                                <YAxis 
                                                                    axisLine={false} 
                                                                    tickLine={false} 
                                                                    tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                                                                />
                                                                <Tooltip content={<CustomTooltip />} />
                                                                <Area 
                                                                    type="monotone" 
                                                                    dataKey={batteryData.length > 0 ? "battery" : "consumption"} 
                                                                    stroke={batteryData.length > 0 ? "#3b82f6" : "#f59e0b"} 
                                                                    strokeWidth={4}
                                                                    fillOpacity={1} 
                                                                    fill={batteryData.length > 0 ? "url(#colorBattery)" : "url(#colorConsumption)"} 
                                                                    animationDuration={1500}
                                                                />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 p-8 text-center">
                                                            <Battery size={48} className="mb-4 opacity-20" />
                                                            <p className="text-sm font-bold uppercase tracking-widest">Sin datos históricos suficientes</p>
                                                            <p className="text-[10px] mt-1">Este dispositivo no reporta nivel de batería ni consumo energético en tiempo real.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stats Cards */}
                                            <div className="space-y-6">
                                                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-xl shadow-blue-600/20">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                                                        <TrendingUp size={24} />
                                                    </div>
                                                    <h4 className="text-sm font-black uppercase tracking-widest opacity-80 mb-2">Estado Actual</h4>
                                                    <p className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">{selectedDeviceData.stats.latestStatus}</p>
                                                    <div className="flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1.5 rounded-xl border border-white/10">
                                                        <Activity size={14} /> Sistema en línea
                                                    </div>
                                                </div>

                                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                            <Info size={20} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Información</h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Detalles técnicos</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</span>
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedDeviceData.device.type}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conexión</span>
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedDeviceData.device.connectionType}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-3">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID BBDD</span>
                                                            <span className="text-[10px] font-mono text-slate-300 truncate max-w-[100px]">{selectedDeviceId}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-32 text-center">
                                        <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-8 border border-slate-100 dark:border-slate-800 opacity-50">
                                            <Smartphone size={48} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none mb-2">Selecciona un dispositivo</h3>
                                        <p className="text-slate-400 font-medium">Elige un dispositivo de la lista para visualizar su análisis detallado</p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>
            )}
        </div>
    );
}
