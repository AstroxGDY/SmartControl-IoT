import { useState, useEffect, useCallback } from 'react';
import { DeviceCard } from '../components/DeviceCard';
import type { IDevice } from '../../../shared/types';

export default function Devices() {
  const [devices, setDevices] = useState<IDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetch('http://localhost:3000/devices')
      .then(res => res.json())
      .then(data => {
        setDevices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  if (loading) return <div className="p-8 font-bold text-slate-400">Cargando Smart Home...</div>;

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {devices.map((device) => (
          <DeviceCard
            key={device._id}
            device={device}
            onDeleted={() => fetchDevices(true)} // silent refresh
          />
        ))}
      </div>
    </div>
  );
}