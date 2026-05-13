import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import TitleBar from './TitleBar';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-[#F5F7FF] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {/* El Outlet es el hueco donde se cargarán las "Páginas" */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}