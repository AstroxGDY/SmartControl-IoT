import { X, Cpu, Server, Hash } from 'lucide-react';

interface DeviceDetailsModalProps {
    device: any;
    onClose: () => void;
}

export const DeviceDetailsModal = ({ device, onClose }: DeviceDetailsModalProps) => {
    if (!device) return null;

    const metadata = device.attributes || {};
    const dps = metadata.dps || {};

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
                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-500 font-semibold text-xs rounded-full uppercase tracking-wider">
                                Type: {device.type}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors self-start">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">

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
                        <Hash size={16} /> Data Points (Telemetría Tuya)
                    </h3>

                    {Object.keys(dps).length === 0 ? (
                        <div className="bg-yellow-50 text-yellow-600 p-4 rounded-xl text-sm italic border border-yellow-100 text-center">
                            No se detectaron Data Points. ¿El dispositivo está desconectado físicamente?
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(dps).map(([key, value]) => {
                                const isBoolean = typeof value === 'boolean';
                                const isNumber = typeof value === 'number';

                                return (
                                    <div key={key} className="bg-white border shadow-sm border-gray-100 p-3 rounded-xl hover:border-purple-300 transition-colors flex flex-col justify-between group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] bg-gray-100 text-gray-500 font-black px-1.5 py-0.5 rounded">DP {key}</span>
                                        </div>

                                        <div className="mt-1">
                                            {isBoolean ? (
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-sm font-bold text-gray-700">{value ? 'Encendido / True' : 'Apagado / False'}</span>
                                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${value ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                        <div className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-all ${value ? 'right-0.5' : 'left-0.5'}`}></div>
                                                    </div>
                                                </div>
                                            ) : isNumber ? (
                                                <span className="text-lg font-black text-purple-600">{value}</span>
                                            ) : (
                                                <span className="text-sm font-semibold text-gray-700 break-words">{String(value)}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};