'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Building2, ClipboardList, CalendarDays, BarChart3, LogOut } from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Centros Médicos', href: '/medical-centers', icon: Building2 },
  { name: 'Visitas', href: '/visits', icon: ClipboardList },
  { name: 'Itinerario', href: '/itinerary', icon: CalendarDays },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="flex h-full w-full flex-col bg-slate-900 text-white">
      {/* SECCIÓN DEL LOGO */}
      <div className="flex h-20 items-center justify-center border-b border-slate-800 px-4">
        <img 
          src="/Farmaser%20Logo.png" 
          alt="Farmaser Logo" 
          className="h-10 w-auto object-contain" 
        />
      </div>

      {/* MENÚ DE NAVEGACIÓN */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center rounded-lg px-3 py-2 transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* BOTÓN DE SALIR */}
      <div className="border-t border-slate-800 p-4">
        <button 
          onClick={logout} 
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/20 hover:text-red-300"
        >
          <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}