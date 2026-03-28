'use client'

import Navbar from '@/app/components/layout/Navbar'
import Sidebar from '@/app/components/layout/Sidebar'

export default function ItineraryPage() {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-8 overflow-auto">
          <h1 className="text-3xl font-bold mb-8">Mi Itinerario</h1>

          <div className="grid grid-cols-7 gap-4">
            {days.map((day) => (
              <div key={day} className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-4 text-center">{day}</h3>
                <div className="space-y-2">
                  <div className="bg-blue-100 text-blue-800 p-3 rounded text-sm">
                    <p className="font-medium">Bogotá</p>
                    <p className="text-xs">8:00 - 17:00</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
