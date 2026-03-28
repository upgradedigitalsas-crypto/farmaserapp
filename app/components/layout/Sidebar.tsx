'use client'

import { useAuthStore } from '@/lib/store'
import { Calendar, BarChart3, Users, ClipboardList, Home } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const { user } = useAuthStore()
  const pathname = usePathname()

  if (!user) return null

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/visits', label: 'Visitas', icon: ClipboardList },
    { href: '/itinerary', label: 'Itinerarios', icon: Calendar },
    { href: '/medical-centers', label: 'Médicos', icon: Users },
    ...(user.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: BarChart3 }] : []),
  ]

  return (
    <aside className="w-64 bg-gray-900 text-white p-6">
      <div className="mb-8">
        <h2 className="text-xl font-bold">Menú</h2>
      </div>

      <nav className="space-y-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded ${
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
