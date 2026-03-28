'use client'

import Navbar from '@/app/components/layout/Navbar'
import Sidebar from '@/app/components/layout/Sidebar'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Acceso denegado</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-8 overflow-auto">
          <h1 className="text-3xl font-bold mb-8">Panel de Administración</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Estadísticas Generales</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Visitadores:</span>
                  <span className="font-bold">15</span>
                </div>
                <div className="flex justify-between">
                  <span>Cobertura Promedio:</span>
                  <span className="font-bold">78%</span>
                </div>
                <div className="flex justify-between">
                  <span>Visitas Hoy:</span>
                  <span className="font-bold">125</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Gestión de Usuarios</h2>
              <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                Agregar Visitador
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
