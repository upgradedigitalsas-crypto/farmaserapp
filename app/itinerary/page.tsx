'use client'

import Navbar from '@/app/components/layout/Navbar'
import Sidebar from '@/app/components/layout/Sidebar'
import { useAuthStore } from '@/lib/store'
import { addDays, eachDayOfInterval, endOfMonth, format, isWithinInterval, parseISO, startOfMonth } from 'date-fns'
import { useMemo, useState } from 'react'

const colors = ['bg-blue-100 text-blue-800 border-blue-200', 'bg-green-100 text-green-800 border-green-200', 'bg-purple-100 text-purple-800 border-purple-200', 'bg-orange-100 text-orange-800 border-orange-200']

export default function ItineraryPage() {
  const { user, itineraries, createItinerary, deleteItinerary } = useAuthStore()
  const currentMonth = new Date()
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const myTrips = itineraries.filter((item) => user && item.visitadorId === user.uid)

  const [form, setForm] = useState({
    city: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    startTime: '08:00',
    endTime: '18:00',
    notes: '',
  })
  const [feedback, setFeedback] = useState('')

  const tripsByDay = useMemo(() => {
    return days.map((day) => ({
      day,
      trips: myTrips.filter((trip) => isWithinInterval(day, { start: parseISO(trip.startDate), end: parseISO(trip.endDate) })),
    }))
  }, [days, myTrips])

  const handleCreate = () => {
    const response = createItinerary(form)
    setFeedback(response.message)
    if (response.ok) setForm({ ...form, city: '', notes: '' })
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-8 overflow-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Itinerario</h1>
            <p className="text-gray-600 mt-2">Calendario pintado de viajes. No se permiten superposiciones.</p>
          </div>

          {feedback && <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl">{feedback}</div>}

          <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
            <section className="bg-white rounded-2xl shadow p-6 space-y-4 h-fit">
              <h2 className="text-xl font-bold">Nuevo viaje</h2>
              <div>
                <label className="text-sm font-medium">Ciudad</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Fecha entrada</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha salida</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Hora entrada</label>
                  <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">Hora salida</label>
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Observación</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 min-h-[90px]" />
              </div>
              <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Guardar itinerario</button>
            </section>

            <section className="bg-white rounded-2xl shadow p-6">
              <div className="grid grid-cols-7 gap-3 text-sm">
                {tripsByDay.map(({ day, trips }) => (
                  <div key={day.toISOString()} className="min-h-[160px] rounded-xl border bg-gray-50 p-2">
                    <div className="font-semibold mb-2 text-center">{format(day, 'dd/MM')}</div>
                    <div className="space-y-2">
                      {trips.map((trip, index) => (
                        <div key={trip.id} className={`border rounded-lg p-2 text-xs ${colors[index % colors.length]}`}>
                          <p className="font-semibold">{trip.city}</p>
                          <p>{trip.startTime} - {trip.endTime}</p>
                          <button onClick={() => deleteItinerary(trip.id)} className="underline mt-1">Eliminar</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
