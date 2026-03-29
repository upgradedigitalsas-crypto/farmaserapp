'use client'

import Navbar from '@/app/components/layout/Navbar'
import Sidebar from '@/app/components/layout/Sidebar'
import { useAuthStore, visitStatusClass, visitStatusLabel } from '@/lib/store'
import { format, parseISO } from 'date-fns'
import { useMemo, useState } from 'react'

export default function AdminPage() {
  const store = useAuthStore()
  const { user, visits, reactivateUnreportedVisit, deleteVisit, baseEntities } = store
  const [reactivationDates, setReactivationDates] = useState<Record<string, string>>({})

  const unreportedVisits = visits.filter((visit) => visit.estado === 'vencida_no_reportada')
  const summary = useMemo(() => {
    const uniqueVisitadores = Array.from(new Set(visits.map((visit) => visit.visitadorId))).length
    const assignedBase = baseEntities.length
    const planned = visits.length
    const forgotten = unreportedVisits.length
    return { uniqueVisitadores, assignedBase, planned, forgotten }
  }, [visits, baseEntities, unreportedVisits])

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
        <main className="flex-1 p-8 overflow-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Log administrativo</h1>
            <p className="text-gray-600">Control de citas planeadas no reportadas y reactivación de flujo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow p-6"><p className="text-sm text-gray-500">Visitadores</p><p className="text-3xl font-bold">{summary.uniqueVisitadores}</p></div>
            <div className="bg-white rounded-2xl shadow p-6"><p className="text-sm text-gray-500">Base total</p><p className="text-3xl font-bold">{summary.assignedBase}</p></div>
            <div className="bg-white rounded-2xl shadow p-6"><p className="text-sm text-gray-500">Planeadas</p><p className="text-3xl font-bold">{summary.planned}</p></div>
            <div className="bg-white rounded-2xl shadow p-6"><p className="text-sm text-gray-500">No reportadas</p><p className="text-3xl font-bold text-orange-500">{summary.forgotten}</p></div>
          </div>

          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold">Citas vencidas no reportadas</h2>
            </div>
            <div className="divide-y">
              {unreportedVisits.length === 0 ? (
                <div className="p-6 text-gray-500">No hay citas vencidas no reportadas.</div>
              ) : (
                unreportedVisits.map((visit) => (
                  <div key={visit.id} className="p-6 space-y-4">
                    <div className="flex justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-semibold">{visit.entityName}</p>
                        <p className="text-sm text-gray-500">{visit.city} · {visit.address}</p>
                        <p className="text-sm text-gray-500">Fecha planeada: {format(parseISO(visit.fechaPlaneada), 'dd/MM/yyyy')}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm h-fit ${visitStatusClass[visit.estado]}`}>{visitStatusLabel[visit.estado]}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[220px_auto_auto] gap-3 items-end">
                      <div>
                        <label className="text-sm font-medium">Nueva fecha</label>
                        <input
                          type="date"
                          value={reactivationDates[visit.id] || format(new Date(), 'yyyy-MM-dd')}
                          onChange={(e) => setReactivationDates((prev) => ({ ...prev, [visit.id]: e.target.value }))}
                          className="mt-1 w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <button
                        onClick={() => reactivateUnreportedVisit({ visitId: visit.id, fechaPlaneada: reactivationDates[visit.id] || format(new Date(), 'yyyy-MM-dd') })}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Reactivar
                      </button>
                      <button
                        onClick={() => deleteVisit(visit.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
