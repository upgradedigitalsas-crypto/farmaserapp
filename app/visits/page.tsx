'use client'

import Navbar from '@/app/components/layout/Navbar'
import Sidebar from '@/app/components/layout/Sidebar'
import { useAuthStore } from '@/lib/store'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'

export default function VisitsPage() {
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')

  const visits = [
    { id: 1, doctor: 'Dr. Juan García', type: 'Médico', date: '2024-03-28', status: 'Completada' },
    { id: 2, doctor: 'Droguería Central', type: 'Droguería', date: '2024-03-28', status: 'Pendiente' },
    { id: 3, doctor: 'Dra. María López', type: 'Médico', date: '2024-03-28', status: 'Completada' },
  ]

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-8 overflow-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Gestión de Visitas</h1>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
              <Plus size={20} />
              Nueva Visita
            </button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por médico o droguería..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Nombre</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Tipo</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-3">{visit.doctor}</td>
                    <td className="px-6 py-3">{visit.type}</td>
                    <td className="px-6 py-3">{visit.date}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          visit.status === 'Completada'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {visit.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}
