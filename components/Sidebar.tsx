'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles, LayoutDashboard, Building2, ClipboardList, CalendarDays,
  BarChart3, LogOut, BookOpen, Lock, UserCircle, Headphones,
} from 'lucide-react';

const menuItems = [
  { name: 'Novedades',         href: '/news',            icon: Sparkles        },
  { name: 'Dashboard',         href: '/dashboard',       icon: LayoutDashboard },
  { name: 'Centros Médicos',   href: '/medical-centers', icon: Building2       },
  { name: 'Visitas',           href: '/visits',          icon: ClipboardList   },
  { name: 'Itinerario',        href: '/itinerary',       icon: CalendarDays    },
  { name: 'Reportes',          href: '/reports',         icon: BarChart3       },
  { name: 'Labores Visitador', href: '/labores',         icon: BookOpen        },
  { name: 'E-Learning',        href: '/elearning',       icon: Lock            },
  { name: 'Evaluación',        href: '/evaluacion',      icon: Lock            },
  { name: 'Mi Perfil',         href: '/perfil',          icon: UserCircle      },
];

const SUPPORT_ADMIN_EMAIL = 'upgradedigitalsas@gmail.com';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col bg-[#111318] text-white">

      {/* Logo */}
      <div className="flex h-[68px] items-center justify-center border-b border-white/[0.06] px-5 shrink-0">
        <img
          src="/Farmaser%20Logo.png"
          alt="Farmaser Logo"
          className="h-9 w-auto object-contain"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'
                }`}
            >
              <item.icon
                size={17}
                className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Soporte — solo admin */}
        {user?.email?.toLowerCase() === SUPPORT_ADMIN_EMAIL && (
          <Link
            href="/soporte"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
              ${pathname === '/soporte'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25'
                : 'text-teal-500 hover:bg-teal-500/10 hover:text-teal-300'
              }`}
          >
            <Headphones size={17} className="shrink-0" />
            <span>Inbox Soporte</span>
          </Link>
        )}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/[0.06] p-3 shrink-0">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
        >
          <LogOut size={17} className="shrink-0" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
