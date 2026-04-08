import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#F8F9FD] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* El Outlet es el hueco donde se cargarán las "Páginas" */}
        <Outlet />
      </main>
    </div>
  );
}