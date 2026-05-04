'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
// Aquí nos aseguramos de importar Sparkles para el icono de Novedades
import { 
  Sparkles, LayoutDashboard, Building2, ClipboardList, 
  CalendarDays, BarChart3, BookOpen, Lock, UserCircle, 
  LogOut, Menu, X 
} from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const { logout } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    // 🔥 AQUÍ ESTÁ EL BOTÓN DE NOVEDADES RESTAURADO
    { name: 'Novedades', icon: Sparkles, path: '/news' },
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Centros Médicos', icon: Building2, path: '/medical-centers' },
    { name: 'Visitas', icon: ClipboardList, path: '/visits' },
    { name: 'Itinerario', icon: CalendarDays, path: '/itinerary' },
    { name: 'Reportes', icon: BarChart3, path: '/reports' },
    { name: 'Labores Visitador', icon: BookOpen, path: '/labores' },
    { name: 'E-Learning', icon: Lock, path: '/elearning' },
    { name: 'Evaluación', icon: Lock, path: '/evaluacion' },
    { name: 'Mi Perfil', icon: UserCircle, path: '/perfil' },
  ]

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden fixed top-6 left-6 z-[60] p-3 bg-gray-900 text-white rounded-2xl shadow-xl">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-white transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 border-r border-gray-800`}>
        <div className="flex flex-col h-full p-6">
          
          <div className="mb-10 pt-4 px-2">
            <img src="/Farmaser%20Logo.png" alt="Farmaser Logo" className="h-12 w-auto object-contain" />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-2 italic">Gestión Pro</p>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto pr-2">
            {menuItems.map((item) => (
              <Link key={item.path} href={item.path} onClick={() => setIsOpen(false)}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${pathname === item.path ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <item.icon size={20} /> {item.name}
              </Link>
            ))}
          </nav>

          <div className="pt-6 border-t border-gray-800 shrink-0">
            <button onClick={() => logout()} className="flex items-center gap-4 px-4 py-4 w-full text-red-400 font-bold text-sm hover:bg-red-500/10 rounded-2xl transition-all">
              <LogOut size={20} /> SALIR
            </button>
          </div>
        </div>
      </aside>
      {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" />}
    </>
  )
}