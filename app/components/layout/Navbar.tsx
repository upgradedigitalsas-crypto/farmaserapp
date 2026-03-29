'use client'

import { useAuthStore } from '@/lib/store'
import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

export default function Navbar() {
  const { user, logout, hydrateBusinessRules } = useAuthStore()

  useEffect(() => {
    hydrateBusinessRules()
  }, [hydrateBusinessRules])

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  if (!user) return null

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
              Farmaser
            </Link>
            <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 uppercase tracking-wide">
              {user.role}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden md:inline">{user.displayName} · {user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              <LogOut size={18} />
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
