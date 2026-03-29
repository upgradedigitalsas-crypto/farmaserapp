'use client'

import Navbar from '@/app/components/layout/Navbar'
import Sidebar from '@/app/components/layout/Sidebar'
import { getMonthlyVisitStats, selectAvailableEntitiesForCurrentMonth, useAuthStore, visitStatusClass, visitStatusLabel } from '@/lib/store'
import { format, isSameDay, parseISO } from 'date-fns'
import { Download, Plus, Save } from 'lucide-react'
import { useMemo, useState } from 'react'

function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [headers.join(','), ...rows.map((row) => headers.map((header) => JSON.stringify(String(row[header] ?? ''))).join(','))].join('\n')
}

export default function VisitsPage() {
  const store = useAuthStore()
  const { user, visits, products, createPlanning, reportVisit, hydrateBusinessRules } = store
  hydrateBusinessRules()

  const availableEntities = selectAvailableEntitiesForCurrentMonth(store)
  const stats = getMonthlyVisitStats(store)
  const todayVisits = useMemo(
    () => visits.filter((visit) => user && visit.visitadorId === user.uid && isSameDay(parseISO(visit.fechaPlaneada), new Date()) && visit.estado === 'planeada'),
    [visits, user],
  )

  const [entityId, setEntityId] = useState(availableEntities[0]?.id ?? '')
  const [fechaPlaneada, setFechaPlaneada] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [feedback, setFeedback] = useState('')
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null)
  const [reportForms, setReportForms] = useState<Record<string, { estado: 'realizada' | 'cancelada' | 'reprogramada'; motivo: string; observations: string; fechaRealVisita: string; formulations: { productId: string; quantity: number }[] }>>({})

  const exportCsv = () => {
    const csv = toCsv(
      visits
        .filter((visit) => user && visit.visitadorId === user.uid)
        .map((visit) => ({ nombre: visit.entityName, tipo: visit.entityType, fecha_planeada: visit.fechaPlaneada, estado: visitStatusLabel[visit.estado], ciudad: visit.city })),
    )
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'visitas.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const selectedEntity = availableEntities.find((item) => item.id === entityId)

  const handleCreatePlanning = () => {
    const response = createPlanning(entityId, fechaPlaneada)
    setFeedback(response.message)
    if (response.ok) {
      setEntityId('')
      setFechaPlaneada(format(new Date(), 'yyyy-MM-dd'))
    }
  }

  const initReportForm = (visitId: string) => {
    if (reportForms[visitId]) return
    setReportForms((prev) => ({
      ...prev,
      [visitId]: {
        estado: 'realizada',
        motivo: '',
        observations: '',
        fechaRealVisita: '',
        formulations: [{ productId: products[0]?.id || '', quantity: 1 }],
      },
    }))
  }

  const updateForm = (visitId: string, patch: Partial<{ estado: 'realizada' | 'cancelada' | 'reprogramada'; motivo: string; observations: string; fechaRealVisita: string; formulations: { productId: string; quantity: number }[] }>) => {
    initReportForm(visitId)
    setReportForms((prev) => ({ ...prev, [visitId]: { ...prev[visitId], ...patch } }))
  }

  const handleReport = (visitId: string) => {
    const form = reportForms[visitId]
    if (!form) return
    const response = reportVisit({
      visitId,
      estado: form.estado,
      motivo: form.motivo,
      observations: form.observations,
      fechaRealVisita: form.fechaRealVisita,
      formulations: form.formulations.filter((item) => item.productId && item.quantity > 0),
    })
    setFeedback(response.message)
    if (response.ok) setActiveVisitId(null)
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-8 overflow-auto space-y-8">
          <div className="flex justify-between items-start gap-6 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">Planeación y reporte</h1>
              <p className="text-gray-600 mt-2">Planea una sola vez por mes y reporta únicamente las citas del día en curso.</p>
            </div>
            <button onClick={exportCsv} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
              <Download size={18} /> Exportar CSV
            </button>
          </div>

          {feedback && <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl">{feedback}</div>}

          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
            <section className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="text-blue-600" size={20} />
                <h2 className="text-xl font-bold">Planeación del mes</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Médico o droguería</label>
                  <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2">
                    <option value="">Selecciona</option>
                    {availableEntities.map((entity) => (
                      <option key={entity.id} value={entity.id}>{entity.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha de visita</label>
                  <input type="date" value={fechaPlaneada} onChange={(e) => setFechaPlaneada(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
                </div>
              </div>

              {selectedEntity && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><span className="text-gray-500 block">Ciudad</span><strong>{selectedEntity.city}</strong></div>
                  <div><span className="text-gray-500 block">Dirección</span><strong>{selectedEntity.address}</strong></div>
                  <div><span className="text-gray-500 block">Categoría</span><strong>{selectedEntity.category}</strong></div>
                </div>
              )}

              <button onClick={handleCreatePlanning} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Guardar planeación</button>

              <div className="border-t pt-4 text-sm text-gray-600">
                <p><strong>Disponibles para planeación este mes:</strong> {availableEntities.length}</p>
                <p><strong>Planeadas:</strong> {stats.planned} · <strong>Realizadas:</strong> {stats.realized}</p>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Reporte del día</h2>
              <p className="text-sm text-gray-500 mb-4">Solo ves y reportas citas de hoy. Las no reportadas pasan al log administrativo.</p>
              <div className="space-y-4">
                {todayVisits.length === 0 ? (
                  <div className="p-4 rounded-xl bg-gray-50 text-gray-500">No hay citas pendientes para hoy.</div>
                ) : (
                  todayVisits.map((visit) => {
                    const form = reportForms[visit.id]
                    return (
                      <div key={visit.id} className="border rounded-2xl p-4">
                        <div className="flex justify-between gap-4 flex-wrap">
                          <div>
                            <p className="font-semibold">{visit.entityName}</p>
                            <p className="text-sm text-gray-500">{visit.city} · {visit.address}</p>
                            <p className="text-sm text-gray-500">{visit.entityType} · {visit.category}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm h-fit ${visitStatusClass[visit.estado]}`}>
                            {visitStatusLabel[visit.estado]}
                          </span>
                        </div>

                        <div className="mt-4">
                          <button
                            onClick={() => {
                              setActiveVisitId(activeVisitId === visit.id ? null : visit.id)
                              initReportForm(visit.id)
                            }}
                            className="text-blue-600 font-medium"
                          >
                            {activeVisitId === visit.id ? 'Cerrar formulario' : 'Reportar cita'}
                          </button>
                        </div>

                        {activeVisitId === visit.id && form && (
                          <div className="mt-4 space-y-4 bg-gray-50 p-4 rounded-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Estado</label>
                                <select value={form.estado} onChange={(e) => updateForm(visit.id, { estado: e.target.value as 'realizada' | 'cancelada' | 'reprogramada' })} className="mt-1 w-full border rounded-lg px-3 py-2">
                                  <option value="realizada">Realizada</option>
                                  <option value="cancelada">Cancelada</option>
                                  <option value="reprogramada">Reprogramada</option>
                                </select>
                              </div>
                              {form.estado === 'reprogramada' && (
                                <div>
                                  <label className="text-sm font-medium">Nueva fecha real de visita</label>
                                  <input type="date" value={form.fechaRealVisita} onChange={(e) => updateForm(visit.id, { fechaRealVisita: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2" />
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="text-sm font-medium">Motivo / razón</label>
                              <input type="text" value={form.motivo} onChange={(e) => updateForm(visit.id, { motivo: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2" />
                            </div>

                            <div>
                              <label className="text-sm font-medium">Observaciones</label>
                              <textarea value={form.observations} onChange={(e) => updateForm(visit.id, { observations: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 min-h-[100px]" />
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-medium">Formulación de productos</label>
                                <button
                                  type="button"
                                  className="text-blue-600 text-sm"
                                  onClick={() => updateForm(visit.id, { formulations: [...form.formulations, { productId: products[0]?.id || '', quantity: 1 }] })}
                                >
                                  Agregar producto
                                </button>
                              </div>
                              <div className="space-y-2">
                                {form.formulations.map((item, index) => (
                                  <div key={`${visit.id}-${index}`} className="grid grid-cols-[1fr_120px] gap-3">
                                    <select value={item.productId} onChange={(e) => {
                                      const next = [...form.formulations]
                                      next[index] = { ...next[index], productId: e.target.value }
                                      updateForm(visit.id, { formulations: next })
                                    }} className="border rounded-lg px-3 py-2">
                                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                                    </select>
                                    <input type="number" min={1} value={item.quantity} onChange={(e) => {
                                      const next = [...form.formulations]
                                      next[index] = { ...next[index], quantity: Number(e.target.value) }
                                      updateForm(visit.id, { formulations: next })
                                    }} className="border rounded-lg px-3 py-2" />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button onClick={() => handleReport(visit.id)} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
                              <Save size={18} /> Guardar reporte
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
