import { Cpu, Wifi } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ScannedDevice {
    name: string;
    type: string;
    connectionType: string;
    status: string;
    image: string;
    params?: Record<string, any>;
}

interface ScannedDeviceCardProps {
    device: ScannedDevice;
    isPairing?: boolean;
    onAdd?: () => void;
}

export const ScannedDeviceCard = ({ device, isPairing = false, onAdd }: ScannedDeviceCardProps) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800/80 hover:border-cyan-500/50 hover:bg-cyan-50 dark:hover:bg-slate-900 transition-all p-4 rounded-xl flex items-center justify-between group shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shrink-0">
                    <img src={device.image} alt={device.name} className="w-full h-full object-cover" />
                </div>
                <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">{device.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 shrink-0">
                            <Cpu size={12} /> {device.type.substring(0, 15)}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                            <Wifi size={12} /> {device.connectionType}
                        </span>
                    </div>
                </div>
            </div>

            <button 
                onClick={onAdd}
                disabled={isPairing}
                className={`font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-lg shrink-0 flex items-center justify-center gap-2 ${
                  isPairing 
                  ? 'bg-cyan-900/50 text-cyan-400 cursor-not-allowed border border-cyan-800' 
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/10 dark:shadow-cyan-900/50'
                }`}
            >
                {isPairing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                    {t('scan.pairing')}
                  </>
                ) : (
                  t('scan.add_to_network')
                )}
            </button>
        </div>
    );
};
