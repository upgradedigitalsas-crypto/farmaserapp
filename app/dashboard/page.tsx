'use client'

import Navbar from '@/app/components/layout/Navbar'
import Sidebar from '@/app/components/layout/Sidebar'
import { getMonthlyVisitStats, useAuthStore, visitStatusClass, visitStatusLabel } from '@/lib/store'
import { BarChart3, Users, Calendar, ClipboardList, AlertTriangle } from 'lucide-react'
import { format, isSameDay, parseISO } from 'date-fns'

export default function DashboardPage() {
  const store = useAuthStore()
  const { user, visits, baseEntities, hydrateBusinessRules } = store
  hydrateBusinessRules()

  const stats = getMonthlyVisitStats(store)
  const todayVisits = visits.filter((visit) => user && visit.visitadorId === user.uid && isSameDay(parseISO(visit.fechaPlaneada), new Date()))
  const forgottenVisits = visits.filter((visit) => user && visit.visitadorId === user.uid && visit.estado === 'vencida_no_reportada')
  const assigned = baseEntities.filter((entity) => user && entity.assignedTo === user.uid)

  const cards = [
    { label: 'Visitas planeadas del mes', value: String(stats.planned), icon: ClipboardList, color: 'bg-blue-500' },
    { label: 'Cobertura mensual', value: `${stats.coverage}%`, icon: Users, color: 'bg-green-500' },
    { label: 'Tasa de reporte', value: `${stats.reportRate}%`, icon: BarChart3, color: 'bg-purple-500' },
    { label: 'Tasa de olvido', value: `${stats.forgetRate}%`, icon: AlertTriangle, color: 'bg-orange-500' },
  ]

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-8 overflow-auto">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600 mb-8">Indicadores del mes en curso y operación del día.</p>

          {user?.role === 'admin' && (
            <div className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <p className="text-blue-700 font-medium">Vista administrativa activa.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {cards.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-white rounded-2xl shadow p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">{stat.label}</p>
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-xl`}>
                      <Icon className="text-white" size={24} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Base asignada</h2>
              <p className="text-4xl font-bold text-blue-600">{assigned.length}</p>
              <p className="text-sm text-gray-500 mt-2">Médicos y droguerías asignados al visitador este mes.</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Visitas de hoy</h2>
              <p className="text-4xl font-bold text-green-600">{todayVisits.length}</p>
              <p className="text-sm text-gray-500 mt-2">Solo estas citas deben reportarse hoy.</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">No reportadas</h2>
              <p className="text-4xl font-bold text-orange-500">{forgottenVisits.length}</p>
              <p className="text-sm text-gray-500 mt-2">Citas vencidas por olvido de reporte.</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Agenda operativa del día</h2>
              <div className="space-y-3">
                {todayVisits.length === 0 ? (
                  <p className="text-gray-500">No tienes citas planeadas para hoy.</p>
                ) : (
                  todayVisits.map((visit) => (
                    <div key={visit.id} className="flex justify-between items-start gap-3 p-3 border rounded-xl">
                      <div>
                        <p className="font-medium">{visit.entityName}</p>
                        <p className="text-sm text-gray-500">{visit.city} · {visit.address}</p>
                        <p className="text-sm text-gray-500">{format(parseISO(visit.fechaPlaneada), 'dd/MM/yyyy')}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${visitStatusClass[visit.estado]}`}>
                        {visitStatusLabel[visit.estado]}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Resumen mensual</h2>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between"><span>Planeadas</span><strong>{stats.planned}</strong></div>
                <div className="flex justify-between"><span>Reportadas</span><strong>{stats.reported}</strong></div>
                <div className="flex justify-between"><span>No reportadas</span><strong>{stats.forgotten}</strong></div>
                <div className="flex justify-between"><span>Realizadas</span><strong>{stats.realized}</strong></div>
                <div className="flex justify-between"><span>Cobertura</span><strong>{stats.coverage}%</strong></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
