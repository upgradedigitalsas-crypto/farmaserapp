'use client'

import Navbar from '@/app/components/layout/Navbar'
import Sidebar from '@/app/components/layout/Sidebar'
import { useAuthStore } from '@/lib/store'
import { Download } from 'lucide-react'

function toCsv(rows: Record<string, string>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','))].join('\n')
  return csv
}

export default function MedicalCentersPage() {
  const { user, baseEntities } = useAuthStore()
  const rows = baseEntities.filter((item) => user && item.assignedTo === user.uid)

  const exportCsv = () => {
    const csv = toCsv(rows.map((row) => ({ nombre: row.name, tipo: row.type, categoria: row.category, direccion: row.address, ciudad: row.city })))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'base-asignada.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-8 overflow-auto">
          <div className="flex justify-between items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Base asignada</h1>
              <p className="text-gray-600 mt-2">Médicos y droguerías visibles para planeación y cumplimiento.</p>
            </div>
            <button onClick={exportCsv} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
              <Download size={18} /> Exportar CSV
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Nombre</th>
                  <th className="px-6 py-4 text-left font-semibold">Tipo</th>
                  <th className="px-6 py-4 text-left font-semibold">Categoría</th>
                  <th className="px-6 py-4 text-left font-semibold">Ciudad</th>
                  <th className="px-6 py-4 text-left font-semibold">Dirección</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-6 py-4">{item.name}</td>
                    <td className="px-6 py-4 capitalize">{item.type}</td>
                    <td className="px-6 py-4">{item.category}</td>
                    <td className="px-6 py-4">{item.city}</td>
                    <td className="px-6 py-4">{item.address}</td>
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
