import { LayoutDashboard, Home, PlusCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Sidebar = () => {
  return (
    <aside className="w-20 bg-[#A855F7] flex flex-col items-center py-8 gap-8 text-white shrink-0 h-screen">
      <div className="p-2 bg-white/20 rounded-xl"><LayoutDashboard size={28} /></div>
      <nav className="flex flex-col gap-6 mt-10">
        <Link to="/" title="Dashboard" className="hover:scale-110 transition-transform">
          <Home size={24} />
        </Link>
        <Link to="/api-test" title="Test" className="hover:scale-110 transition-transform opacity-70 hover:opacity-100">
          <PlusCircle size={24} />
        </Link>
      </nav>
      <div className="mt-auto">
        <Settings className="cursor-pointer opacity-70 hover:opacity-100" />
      </div>
    </aside>
  );
};