'use client'

import { useAuthStore } from '@/lib/store'
import { Calendar, Users, ClipboardList, Home, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const { user } = useAuthStore()
  const pathname = usePathname()

  if (!user) return null

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/visits', label: 'Planeación y reporte', icon: ClipboardList },
    { href: '/itinerary', label: 'Itinerario', icon: Calendar },
    { href: '/medical-centers', label: 'Base asignada', icon: Users },
    ...(user.role === 'admin' ? [{ href: '/admin', label: 'Log administrativo', icon: ShieldAlert }] : []),
  ]

  return (
    <aside className="w-72 bg-gray-900 text-white p-6">
      <div className="mb-8">
        <h2 className="text-xl font-bold">Menú</h2>
        <p className="text-gray-400 text-sm mt-2">Operación diaria de visitadores</p>
      </div>

      <nav className="space-y-3">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={`${item.href}-${index}`}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                isActive ? 'bg-blue-600' : 'hover:bg-gray-800'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
