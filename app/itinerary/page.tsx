'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc, orderBy } from 'firebase/firestore'
import { Clock, Loader2, X, Edit3, Filter, MapPin, CalendarDays } from 'lucide-react'

export default function ItineraryPage() {
  // Conectamos con la memoria global (Store)
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  
  const [doctors, setDoctors] = useState<any[]>([]) // Para armar la lista de visitadores
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [trips, setTrips] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    city: '',
    startDate: '2026-04-01',
    endDate: '2026-04-01',
    startTime: '08:00',
    endTime: '18:00',
    observation: ''
  })

  const isAdmin = user?.email?.toLowerCase().trim() === 'entrenamientofarmaser@gmail.com'

  // 1. Cargamos médicos para generar la lista de visitadores (Solo Admin)
  useEffect(() => {
    if (isAdmin) {
      fetch('/api/doctors').then(res => res.json()).then(data => {
        setDoctors(Array.isArray(data) ? data : [])
      })
    }
  }, [isAdmin])

  const repsList = useMemo(() => {
    if (!isAdmin) return []
    return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#'))))
  }, [doctors, isAdmin])

  // 2. Cargamos los viajes (Itinerarios) según el filtro
  const fetchTrips = async () => {
    const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase()
    
    // Si es admin y no ha seleccionado a nadie específico, no cargamos nada
    if (!targetEmail || targetEmail === 'Todos') {
      setTrips([])
      setLoading(false)
      return
    }

    try {
      const q = query(
        collection(db, 'itineraries'), 
        where('userEmail', '==', targetEmail)
      )
      const querySnapshot = await getDocs(q)
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      
      // Filtramos para asegurar que solo vemos el mes de Abril (04)
      setTrips(data.filter((t: any) => t.startDate?.includes('-04-') || t.endDate?.includes('-04-')))
    } catch (e) { 
      console.error(e) 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { fetchTrips() }, [user, selectedRep])

  const handleSave = async () => {
    if (!formData.city || !formData.startDate || !formData.endDate) return alert('Completa los campos')
    if (isAdmin && selectedRep === 'Todos') return alert('Selecciona un visitador específico para asignar esta ruta')
    
    setSaving(true)
    const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase()

    try {
      if (editingId) {
        const docRef = doc(db, 'itineraries', editingId)
        await updateDoc(docRef, { ...formData, updatedAt: Timestamp.now() })
        alert('¡Ruta actualizada!')
      } else {
        await addDoc(collection(db, 'itineraries'), {
          ...formData,
          userEmail: targetEmail,
          createdAt: Timestamp.now()
        })
        alert('¡Ruta guardada!')
      }
      resetForm()
      await fetchTrips()
    } catch (e) { alert('Error al procesar') } finally { setSaving(false) }
  }

  const startEdit = (trip: any) => {
    setEditingId(trip.id)
    setFormData({
      city: trip.city,
      startDate: trip.startDate,
      endDate: trip.endDate,
      startTime: trip.startTime,
      endTime: trip.endTime,
      observation: trip.observation || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({ city: '', startDate: '2026-04-01', endDate: '2026-04-01', startTime: '08:00', endTime: '18:00', observation: '' })
  }

  const getTripForDay = (day: number) => {
    const currentDayStr = `2026-04-${day.toString().padStart(2, '0')}`
    return trips.find(t => currentDayStr >= t.startDate && currentDayStr <= t.endDate)
  }

  const days = Array.from({length: 30}, (_, i) => i + 1) // Abril 2026
  
  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">Itinerario</h1>
          <p className="text-gray-500 font-medium text-sm mt-2">Abril 2026 — Hoja de ruta mensual</p>
        </div>

        {isAdmin && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600"><Filter size={20}/></div>
            <div className="pr-3">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Auditando Ruta</p>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer appearance-none">
                <option value="Todos">-- Seleccionar Visitador --</option>
                {repsList.map((email) => <option key={email} value={email}>{email}</option>)}
              </select>
            </div>
          </div>
        )}
      </header>

      {isAdmin && selectedRep === 'Todos' ? (
        <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-gray-100 text-center">
            <CalendarDays className="mx-auto text-gray-200 mb-4" size={64} />
            <h2 className="text-xl font-black text-gray-400 uppercase italic">Selecciona un visitador para gestionar su itinerario</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FORMULARIO DINÁMICO */}
          <div className={`p-8 rounded-[40px] shadow-sm border transition-all h-fit ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase text-gray-900 leading-none">
                {editingId ? 'Editar viaje' : 'Nueva ruta'}
              </h3>
              {editingId && (
                <button onClick={resetForm} className="p-2 bg-white rounded-full text-orange-500 shadow-sm hover:bg-orange-100 transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ciudad de destino..." className="w-full bg-gray-50 border-none rounded-2xl px-12 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 shadow-inner" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Salida</label>
                  <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-3 py-3 text-[11px] font-bold" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Retorno</label>
                  <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-3 py-3 text-[11px] font-bold" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">H. Inicio</label>
                  <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-3 py-3 text-[11px] font-bold text-gray-600" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">H. Fin</label>
                  <input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-3 py-3 text-[11px] font-bold text-gray-600" />
                </div>
              </div>
              
              <button 
                disabled={saving} 
                onClick={handleSave} 
                className={`w-full text-white text-[10px] font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${editingId ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : editingId ? 'Actualizar Itinerario' : 'Guardar itinerario'}
              </button>
            </div>
          </div>

          {/* CALENDARIO INTERACTIVO */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="p-20 text-center font-black text-gray-300 animate-pulse">Sincronizando calendario...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-2.5">
                {days.map(d => {
                  const trip = getTripForDay(d);
                  return (
                    <div 
                      key={d} 
                      onClick={() => trip && startEdit(trip)}
                      className={`cursor-pointer group p-3 lg:p-3 rounded-[28px] border transition-all min-h-[110px] lg:min-h-[130px] flex flex-col relative ${trip ? 'border-blue-500 ring-2 ring-blue-50 bg-blue-50/20' : 'border-gray-100 hover:border-blue-300 shadow-sm bg-white'}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-[11px] font-black ${trip ? 'text-blue-600' : 'text-gray-300'}`}>
                          {d.toString().padStart(2, '0')} / 04
                        </span>
                        {trip && <Edit3 size={10} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </div>
                      
                      {trip && (
                        <div className="flex-1 flex flex-col justify-center gap-1">
                          <div className="bg-blue-600 text-white text-[10px] lg:text-[7px] font-black uppercase p-1.5 lg:p-1 rounded-lg shadow-sm text-center leading-tight truncate">
                            {trip.city}
                          </div>
                          <div className="flex items-center gap-1 text-[8px] lg:text-[6.5px] text-blue-500 font-bold justify-center">
                            <Clock size={8} className="lg:w-[7px] lg:h-[7px]" /> 
                            {trip.startTime} - {trip.endTime}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}