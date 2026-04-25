import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Importamos nuestras nuevas páginas
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import ScanDevices from './pages/ScanDevices';
import Settings from './pages/Settings';
import BluetoothManager from './pages/BluetoothManager';
import DeviceAnalysis from './pages/DeviceAnalysis';
import DeviceStatistics from './pages/DeviceStatistics';

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
      <Routes>
        {/* Layout es el padre: define la Sidebar */}
        <Route path="/" element={<Layout />}>
          {/* Index es el Dashboard (la página por defecto) */}
          <Route index element={<Dashboard />} />
          <Route path="devices" element={<Devices />} />
          <Route path="scan" element={<ScanDevices />} />
          <Route path="bluetooth" element={<BluetoothManager />} />
          <Route path="analysis" element={<DeviceAnalysis />} />
          <Route path="statistics" element={<DeviceStatistics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}