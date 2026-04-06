import { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, Terminal, Cpu, Loader2, UserCheck } from 'lucide-react';

export interface PortConflict {
    port: number;
    pid: number;
    name: string;
}

interface PortConflictModalProps {
    conflicts: PortConflict[];
    onClose: () => void;
    onKilledAndRescan: () => void;
}

type Step = 'choice' | 'confirm-kill' | 'killing';

export function PortConflictModal({ conflicts, onClose, onKilledAndRescan }: PortConflictModalProps) {
    const [step, setStep] = useState<Step>('choice');
    const [killError, setKillError] = useState<string | null>(null);

    // Agrupar procesos únicos por PID para la lista (un proceso puede tener varios puertos)
    const uniqueProcs = conflicts.reduce<{ pid: number; name: string; ports: number[] }[]>((acc, c) => {
        const existing = acc.find(a => a.pid === c.pid);
        if (existing) {
            existing.ports.push(c.port);
        } else {
            acc.push({ pid: c.pid, name: c.name, ports: [c.port] });
        }
        return acc;
    }, []);

    const handleKillConfirm = async () => {
        setStep('killing');
        setKillError(null);
        const pids = uniqueProcs.map(p => p.pid);

        try {
            const res = await fetch('http://localhost:3000/devices/kill-ports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pids })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error desconocido al cerrar procesos.');
            }

            if (data.failed?.length > 0) {
                throw new Error(`No se pudo cerrar los procesos con PID: ${data.failed.join(', ')}. Intenta cerrarlos manualmente.`);
            }

            // Todo bien → relanzar escaneo
            onKilledAndRescan();
        } catch (e: any) {
            setKillError(e.message);
            setStep('confirm-kill');
        }
    };

    return (
        // Backdrop
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>

            {/* Panel principal */}
            <div className="relative w-full max-w-lg bg-slate-900/95 border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-900/20 overflow-hidden"
                style={{ animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>

                {/* Franja superior naranja */}
                <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

                {/* Botón cerrar */}
                {step !== 'killing' && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                )}

                <div className="p-6">
                    {/* Icono + título */}
                    <div className="flex items-start gap-4 mb-5">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center"
                            style={{ animation: 'pulseWarn 2s ease-in-out infinite' }}>
                            <ShieldAlert size={24} className="text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100">Conflicto de puerto detectado</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Tuya necesita los puertos <span className="text-orange-400 font-mono font-semibold">6666, 6667, 7000</span> para escanear la red.
                                Otra aplicación los está ocupando.
                            </p>
                        </div>
                    </div>

                    {/* Lista de procesos bloqueantes */}
                    <div className="mb-5 rounded-xl overflow-hidden border border-slate-800">
                        <div className="bg-slate-800/60 px-4 py-2.5 flex items-center gap-2 border-b border-slate-800">
                            <Terminal size={13} className="text-orange-400" />
                            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Aplicaciones bloqueantes</span>
                        </div>
                        <div className="divide-y divide-slate-800/50">
                            {uniqueProcs.map(proc => (
                                <div key={proc.pid} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50">
                                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                                        <Cpu size={14} className="text-orange-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-200 truncate">{proc.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">
                                            PID: {proc.pid} · Puerto{proc.ports.length > 1 ? 's' : ''}: {proc.ports.join(', ')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Error de kill si lo hay */}
                    {killError && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-300">{killError}</p>
                        </div>
                    )}

                    {/* ===== PASO: choice ===== */}
                    {step === 'choice' && (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500 text-center mb-4">¿Cómo quieres resolver el conflicto?</p>
                            <button
                                onClick={() => setStep('confirm-kill')}
                                className="w-full group flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-400/60 transition-all duration-200"
                            >
                                <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <ShieldAlert size={18} className="text-orange-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-slate-200 group-hover:text-orange-300 transition-colors">
                                        Cerrar apps automáticamente
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">Nuestro programa cerrará las apps listadas y reintentará.</p>
                                </div>
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full group flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all duration-200"
                            >
                                <div className="w-10 h-10 rounded-lg bg-slate-700/50 border border-slate-600/50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <UserCheck size={18} className="text-slate-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-slate-200 transition-colors">
                                        Lo haré yo mismo
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">Cierra las apps manualmente y vuelve a escanear.</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* ===== PASO: confirm-kill ===== */}
                    {step === 'confirm-kill' && (
                        <div>
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-5 flex items-start gap-3">
                                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-300 mb-1">¿Confirmas el cierre forzado?</p>
                                    <p className="text-xs text-amber-200/70 leading-relaxed">
                                        Se cerrarán <strong>{uniqueProcs.length}</strong> proceso{uniqueProcs.length !== 1 ? 's' : ''} ({uniqueProcs.map(p => p.name).join(', ')}).
                                        Asegúrate de guardar tu trabajo en esas aplicaciones antes de continuar.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('choice')}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-slate-100 text-sm font-medium transition-colors"
                                >
                                    Volver
                                </button>
                                <button
                                    onClick={handleKillConfirm}
                                    className="flex-1 py-2.5 rounded-xl border border-red-500/50 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                >
                                    <ShieldAlert size={15} />
                                    Sí, cerrar y escanear
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ===== PASO: killing ===== */}
                    {step === 'killing' && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <Loader2 size={36} className="text-orange-400 animate-spin" />
                            <div className="text-center">
                                <p className="text-slate-200 font-semibold">Cerrando procesos...</p>
                                <p className="text-slate-500 text-sm mt-1">Esperando a que el sistema libere los puertos.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.92) translateY(12px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes pulseWarn {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
                    50%       { box-shadow: 0 0 16px 4px rgba(249,115,22,0.25); }
                }
            `}</style>
        </div>
    );
}
