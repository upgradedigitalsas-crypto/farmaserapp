'use client'

import Navbar from '@/app/components/layout/Navbar'
import Sidebar from '@/app/components/layout/Sidebar'
import { useAuthStore } from '@/lib/store'
import { BarChart3, Users, Calendar, ClipboardList } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const stats = [
    { label: 'Visitas Hoy', value: '12', icon: ClipboardList, color: 'bg-blue-500' },
    { label: 'Médicos Asignados', value: '45', icon: Users, color: 'bg-green-500' },
    { label: 'Cobertura', value: '82%', icon: BarChart3, color: 'bg-purple-500' },
    { label: 'Pendientes', value: '5', icon: Calendar, color: 'bg-orange-500' },
  ]

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-8 overflow-auto">
          <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

          {user?.role === 'admin' && (
            <div className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-4">
              <p className="text-blue-700">Panel de Administración</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">{stat.label}</p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <Icon className="text-white" size={24} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Visitas Recientes</h2>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between p-3 border-b">
                    <div>
                      <p className="font-medium">Médico {i}</p>
                      <p className="text-sm text-gray-500">Hoy a las 10:30 AM</p>
                    </div>
                    <span className="text-green-600 font-medium">Completada</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Próximas Visitas</h2>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between p-3 border-b">
                    <div>
                      <p className="font-medium">Droguería {i}</p>
                      <p className="text-sm text-gray-500">Mañana a las 2:00 PM</p>
                    </div>
                    <span className="text-orange-600 font-medium">Pendiente</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
