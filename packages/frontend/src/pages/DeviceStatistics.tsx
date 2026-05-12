import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    BarChart3, 
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
    PowerOff,
    MousePointer2,
    Move,
    Lightbulb,
    Thermometer,
    ZapOff,
    History,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Search
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
    Area,
    Bar,
    ComposedChart
} from 'recharts';

const API_URL = 'http://localhost:3000';

interface DeviceStats {
    totalRecords: number;
    latestStatus: 'online' | 'offline' | 'error';
    latestBattery?: number;
    avgBattery?: number;
    totalClicks?: number;
    totalDistance?: number;
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
    dps?: any;
    clicks?: number;
    distance?: number;
    voltage?: number;
    current?: number;
    power?: number;
}

export default function DeviceStatistics() {
    const { t, i18n } = useTranslation();
    const [data, setData] = useState<GlobalStatsData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
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

    const filteredData = useMemo(() => {
        return data.filter(d => 
            d.device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.device.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-emerald-500';
            case 'offline': return 'bg-slate-400';
            case 'error': return 'bg-red-500';
            default: return 'bg-slate-200';
        }
    };

    const selectedDeviceData = data.find(d => d.device._id === selectedDeviceId);

    // Advanced Metric Extractors
    const getPowerMetrics = (point: HistoryPoint) => {
        // First try the dedicated fields
        if (point.power !== undefined || point.voltage !== undefined) {
            return {
                power: point.power || 0,
                voltage: point.voltage || 0,
                current: point.current || 0
            };
        }
        // Fallback to legacy DPS parsing
        const dps = point.dps;
        if (!dps) return { power: 0, voltage: 0, current: 0 };
        const p = dps.cur_power || dps.current_power || dps['19'] || 0;
        const v = dps.cur_voltage || dps.current_voltage || dps['20'] || 0;
        const c = dps.cur_current || dps.current_current || dps['18'] || 0;
        
        return {
            power: typeof p === 'number' ? p / 10 : 0,
            voltage: typeof v === 'number' ? v / 10 : 0,
            current: typeof c === 'number' ? c : 0
        };
    };

    // Chart Formatting
    const chartData = useMemo(() => {
        return (history || []).map((point, idx, arr) => {
            try {
                const date = new Date(point.timestamp);
                if (isNaN(date.getTime())) return null;
                
                const { power, voltage, current } = getPowerMetrics(point);
                
                // APM calculation
                const prevPoints = arr.slice(Math.max(0, idx - 5), idx + 1);
                const recentClicks = prevPoints.reduce((acc, p) => acc + (p.clicks || 0), 0);
                
                return {
                    time: date.toLocaleTimeString(i18n.language || 'es', { hour: '2-digit', minute: '2-digit' }),
                    battery: point.batteryLevel,
                    power,
                    voltage,
                    current,
                    clicks: point.clicks || 0,
                    apm: recentClicks * 2,
                    distance: (point.distance || 0) / 100,
                    fullDate: date.toLocaleString(i18n.language || 'es'),
                    status: point.status
                };
            } catch (e) {
                return null;
            }
        }).filter((p): p is any => p !== null);
    }, [history, i18n.language]);

    const hasBattery = chartData.some(p => p.battery !== undefined);
    const hasPower = chartData.some(p => p.power > 0);
    const hasMouseData = chartData.some(p => p.clicks > 0 || p.distance > 0);

    // Real-time calculations
    const uptimePercent = useMemo(() => {
        if (chartData.length === 0) return 100;
        const onlineCount = chartData.filter(d => d.status === 'online').length;
        return Math.round((onlineCount / chartData.length) * 100);
    }, [chartData]);

    const trendValue = useMemo(() => {
        if (chartData.length < 10) return 0;
        const key = hasPower ? 'power' : hasBattery ? 'battery' : 'apm';
        const mid = Math.floor(chartData.length / 2);
        const firstHalf = chartData.slice(0, mid);
        const secondHalf = chartData.slice(mid);
        const avg1 = firstHalf.reduce((acc, d) => acc + (d[key] || 0), 0) / (firstHalf.length || 1);
        const avg2 = secondHalf.reduce((acc, d) => acc + (d[key] || 0), 0) / (secondHalf.length || 1);
        if (avg1 === 0) return 0;
        return Math.round(((avg2 - avg1) / avg1) * 100);
    }, [chartData, hasPower, hasBattery]);

    const avgVoltage = useMemo(() => {
        const voltages = chartData.filter(d => d.voltage > 0);
        if (voltages.length === 0) return 230; // Default nominal
        return (voltages.reduce((acc, d) => acc + (d.voltage || 0), 0) / voltages.length).toFixed(1);
    }, [chartData]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl backdrop-blur-md bg-white/90 dark:bg-slate-900/90">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        {payload[0].payload.fullDate}
                    </p>
                    <div className="space-y-1.5">
                        {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{entry.name}</span>
                                <span className="text-sm font-black" style={{ color: entry.color }}>
                                    {entry.value.toFixed(1)}{entry.name.toLowerCase().includes('battery') ? '%' : entry.name.toLowerCase().includes('power') ? 'W' : entry.name.toLowerCase().includes('voltage') ? 'V' : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto min-h-screen bg-[#F8F9FD] dark:bg-slate-950 transition-colors duration-500">
            {/* Main Header */}
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                            <BarChart3 className="text-white" size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">
                                {t('statistics.title')}
                            </h1>
                            <p className="text-slate-400 mt-1 font-bold uppercase text-[10px] tracking-[0.2em]">
                                {t('statistics.subtitle')} • {data.length} {t('statistics.devices_monitored')}
                            </p>
                        </div>
                    </div>
                </motion.div>
                
                <div className="flex flex-wrap gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="text"
                            placeholder={t('common.search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-3 bg-white dark:bg-slate-900 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 transition-all outline-none text-sm font-bold dark:text-white"
                        />
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-48">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30 border-t-indigo-600 animate-spin" />
                        <Activity size={32} className="absolute inset-0 m-auto text-indigo-500 animate-pulse" />
                    </div>
                    <p className="mt-8 font-black uppercase tracking-[0.4em] text-[10px] text-indigo-500/60 animate-pulse">{t('statistics.loading_analytics')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Master Sidebar */}
                    <aside className="lg:col-span-3 space-y-4">
                        <div className="flex items-center justify-between px-2 mb-2">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('statistics.all_devices')}</h3>
                            <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full">{filteredData.length}</span>
                        </div>
                        <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredData.map(({ device, stats }) => (
                                <motion.button
                                    key={device._id}
                                    whileHover={{ x: 5 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedDeviceId(device._id)}
                                    className={`w-full group flex items-center gap-4 p-4 rounded-3xl border-2 transition-all duration-300 text-left ${
                                        selectedDeviceId === device._id
                                            ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10'
                                            : 'bg-white/50 dark:bg-slate-900/40 border-transparent hover:bg-white dark:hover:bg-slate-900'
                                    }`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl p-1 shrink-0 relative transition-transform group-hover:scale-110 ${selectedDeviceId === device._id ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                        <img 
                                            src={device.image} 
                                            alt="" 
                                            className="w-full h-full object-contain"
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.svgrepo.com/show/508699/landscape-placeholder.svg' }}
                                        />
                                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${getStatusColor(stats.latestStatus)} shadow-lg`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-black uppercase truncate tracking-tight ${selectedDeviceId === device._id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {device.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-bold uppercase text-slate-400">{device.type}</span>
                                            {stats.latestBattery && (
                                                <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500">
                                                    <Battery size={10} /> {stats.latestBattery}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className={`shrink-0 transition-all ${selectedDeviceId === device._id ? 'text-indigo-500 translate-x-1' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} size={16} />
                                </motion.button>
                            ))}
                        </div>
                    </aside>

                    {/* Dashboard Main Area */}
                    <main className="lg:col-span-9">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedDeviceId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-8"
                            >
                                {selectedDeviceData ? (
                                    <>
                                        {/* Dynamic Stats Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 mb-4">
                                                    <Activity size={20} />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('statistics.status')}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${getStatusColor(selectedDeviceData.stats.latestStatus)}`} />
                                                    <p className="text-xl font-black text-slate-800 dark:text-white uppercase truncate">{selectedDeviceData.stats.latestStatus}</p>
                                                </div>
                                            </div>

                                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 mb-4">
                                                    <Database size={20} />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('statistics.records_total')}</p>
                                                <p className="text-2xl font-black text-slate-800 dark:text-white">{selectedDeviceData.stats.totalRecords.toLocaleString()}</p>
                                            </div>

                                            {hasBattery ? (
                                                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 mb-4">
                                                        <Battery size={20} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('statistics.avg_battery')}</p>
                                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{Math.round(selectedDeviceData.stats.avgBattery || 0)}%</p>
                                                </div>
                                            ) : hasPower ? (
                                                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 mb-4">
                                                        <Zap size={20} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('statistics.cur_consumption')}</p>
                                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{chartData[chartData.length - 1]?.power || 0}W</p>
                                                </div>
                                            ) : (
                                                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 mb-4">
                                                        <Clock size={20} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('statistics.uptime')}</p>
                                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{uptimePercent}%</p>
                                                </div>
                                            )}

                                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                                                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 mb-4">
                                                    <TrendingUp size={20} />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('statistics.trend')}</p>
                                                <div className={`flex items-center gap-1 font-black ${trendValue >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {trendValue >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />} {Math.abs(trendValue)}%
                                                </div>
                                            </div>
                                        </div>

                                        {/* Main Chart Card */}
                                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                                        {hasMouseData ? <MousePointer2 className="text-indigo-500" /> : hasPower ? <Zap className="text-amber-500" /> : <Activity className="text-blue-500" />}
                                                        {hasMouseData ? t('statistics.mouse_activity') : hasPower ? t('statistics.energy_analysis') : t('statistics.historical_data')}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">{t('statistics.last_24h_overview')}</p>
                                                </div>
                                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                                                    <button className="px-4 py-2 bg-white dark:bg-slate-900 text-[10px] font-black uppercase rounded-xl shadow-sm">{t('statistics.live')}</button>
                                                    <button className="px-4 py-2 text-[10px] font-black uppercase text-slate-400">{t('statistics.24h')}</button>
                                                    <button className="px-4 py-2 text-[10px] font-black uppercase text-slate-400">{t('statistics.7d')}</button>
                                                </div>
                                            </div>

                                            <div className="h-[400px] w-full">
                                                {isHistoryLoading ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                                        <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">{t('statistics.processing_data')}</p>
                                                    </div>
                                                ) : chartData.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <ComposedChart data={chartData}>
                                                            <defs>
                                                                <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={hasPower ? "#f59e0b" : "#6366f1"} stopOpacity={0.3}/>
                                                                    <stop offset="95%" stopColor={hasPower ? "#f59e0b" : "#6366f1"} stopOpacity={0}/>
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.1} />
                                                            <XAxis 
                                                                dataKey="time" 
                                                                axisLine={false} 
                                                                tickLine={false} 
                                                                tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}}
                                                                dy={15}
                                                                minTickGap={30}
                                                            />
                                                            <YAxis 
                                                                axisLine={false} 
                                                                tickLine={false} 
                                                                tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}}
                                                                dx={-10}
                                                            />
                                                            <Tooltip content={<CustomTooltip />} cursor={{stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '5 5'}} />
                                                            
                                                            {hasMouseData && (
                                                                <Bar dataKey="clicks" name="Clicks" fill="#A855F7" radius={[4, 4, 0, 0]} barSize={20} />
                                                            )}
                                                            
                                                            <Area 
                                                                type="monotone" 
                                                                dataKey={hasPower ? "power" : hasBattery ? "battery" : "apm"} 
                                                                name={hasPower ? "Power (W)" : hasBattery ? "Battery (%)" : "Activity (APM)"}
                                                                stroke={hasPower ? "#f59e0b" : "#6366f1"} 
                                                                strokeWidth={4}
                                                                fillOpacity={1} 
                                                                fill="url(#colorMain)" 
                                                                animationDuration={2000}
                                                            />
                                                            
                                                            {hasPower && (
                                                                <Line type="monotone" dataKey="voltage" name="Voltage (V)" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                                            )}
                                                        </ComposedChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-12">
                                                        <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800 opacity-50">
                                                            <History size={40} className="text-slate-300" />
                                                        </div>
                                                        <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t('statistics.no_data_yet')}</h4>
                                                        <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">{t('statistics.no_data_desc')}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Legend & Quick Metrics */}
                                            <div className="mt-12 pt-8 border-t border-slate-50 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-8">
                                                {hasPower ? (
                                                    <>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('statistics.peak_power')}</p>
                                                            <p className="text-xl font-black text-amber-500">{Math.max(...chartData.map(d => d.power || 0)).toFixed(1)}W</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('statistics.avg_voltage')}</p>
                                                            <p className="text-xl font-black text-emerald-500">{avgVoltage}V</p>
                                                        </div>
                                                    </>
                                                ) : hasMouseData ? (
                                                    <>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('statistics.total_clicks')}</p>
                                                            <p className="text-xl font-black text-purple-500">{chartData.reduce((acc, d) => acc + (d.clicks || 0), 0)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('statistics.total_distance')}</p>
                                                            <p className="text-xl font-black text-blue-500">{chartData.reduce((acc, d) => acc + (d.distance || 0), 0).toFixed(1)}m</p>
                                                        </div>
                                                    </>
                                                ) : null}
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('statistics.last_sync')}</p>
                                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{chartData.length > 0 ? chartData[chartData.length - 1].time : '--:--'}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                        <Calendar size={18} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{t('statistics.history_stored')}<br/><span className="text-slate-800 dark:text-white">30 {t('common.days')}</span></p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Detail Section */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                                    <Info size={18} className="text-indigo-500" /> {t('statistics.device_details')}
                                                </h4>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('statistics.type')}</span>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">{selectedDeviceData.device.type}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('statistics.connection')}</span>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedDeviceData.device.connectionType}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-3">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('statistics.id')}</span>
                                                        <span className="text-[9px] font-mono text-slate-400 break-all">{selectedDeviceData.device._id}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                                                <div className="absolute -right-8 -bottom-8 opacity-20 pointer-events-none">
                                                    <Zap size={160} />
                                                </div>
                                                <h4 className="text-sm font-black uppercase tracking-widest opacity-80 mb-4">{t('statistics.smart_insight')}</h4>
                                                <p className="text-lg font-black leading-tight mb-6">
                                                    {hasPower 
                                                        ? trendValue < 0 
                                                            ? `El consumo ha bajado un ${Math.abs(trendValue)}% respecto al inicio del periodo.`
                                                            : `El consumo ha subido un ${trendValue}% respecto al inicio del periodo.`
                                                        : hasBattery
                                                            ? `La batería se mantiene estable con un promedio del ${Math.round(selectedDeviceData.stats.avgBattery || 0)}%.`
                                                            : t('statistics.insight_default', 'Este dispositivo mantiene una conexión estable y un rendimiento óptimo.')}
                                                </p>
                                                <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border border-white/20">
                                                    {t('statistics.optimize_now')}
                                                </button>
                                            </div>
                                        </div>
                                    </>

                                ) : (
                                    <div className="flex flex-col items-center justify-center py-48 text-center bg-white/30 dark:bg-slate-900/30 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                        <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center mb-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
                                            <Smartphone size={40} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none mb-3">{t('statistics.select_device_to_start')}</h3>
                                        <p className="text-slate-400 font-medium text-sm max-w-[280px] mx-auto leading-relaxed">{t('statistics.select_device_desc_rich')}</p>
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
