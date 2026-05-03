'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore, TEAM_MAPPING } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Clock, Loader2, X, Edit3, Filter, MapPin, CalendarDays, Trash2, User } from 'lucide-react'

// === LÓGICA AUTOMÁTICA DE FECHAS ===
const now = new Date();
const currentMonthStr = (now.getMonth() + 1).toString().padStart(2, '0');
const currentYear = now.getFullYear();
const monthName = now.toLocaleString('es-ES', { month: 'long' });
const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
const filterKey = `${currentYear}-${currentMonthStr}`;

export default function ItineraryPage() {
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  
  const [doctors, setDoctors] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [trips, setTrips] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    city: '',
    startDate: now.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],   
    startTime: '08:00',
    endTime: '18:00',
    observation: ''
  })

  // === FASE 3.0: Variables de Jerarquía y Blindaje Caché ===
  const userEmail = user?.email?.toLowerCase().trim() || ''
  const isAdmin = user?.role === 'admin' || userEmail === 'entrenamientofarmaser@gmail.com'
  const isManager = user?.role === 'manager' || Object.keys(TEAM_MAPPING).includes(userEmail)

  useEffect(() => {
    // Tanto Admin como Manager necesitan la base de médicos para construir el dropdown
    if (isAdmin || isManager) {
      fetch('/api/doctors').then(res => res.json()).then(data => {
        setDoctors(Array.isArray(data) ? data : [])
      })
    }
  }, [isAdmin, isManager])

  // Lista para el Dropdown
  const repsList = useMemo(() => {
    if (isAdmin) {
      return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#')))).sort()
    } else if (isManager) {
      const myTeam = TEAM_MAPPING[userEmail] || []
      return myTeam.filter(email => email !== userEmail).sort()
    }
    return []
  }, [doctors, isAdmin, isManager, userEmail])

  const fetchTrips = async () => {
    const targetEmail = (isAdmin || isManager) && selectedRep !== 'Todos' ? selectedRep : userEmail
    
    // Si es Admin/Manager y está en "Todos/Consolidado", en esta pantalla pedimos que seleccione a alguien
    // Porque un itinerario mezclado de 10 personas en un solo calendario no es legible.
    if (!targetEmail || selectedRep === 'Todos') {
      setTrips([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const q = query(
        collection(db, 'itineraries'), 
        where('userEmail', '==', targetEmail)
      )
      const querySnapshot = await getDocs(q)
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      
      // FILTRO DINÁMICO: Solo muestra rutas del mes actual
      setTrips(data.filter((t: any) => t.startDate?.includes(filterKey) || t.endDate?.includes(filterKey)))
    } catch (e) { 
      console.error(e) 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { fetchTrips() }, [user, selectedRep])

  const handleSave = async () => {
    if (!formData.city || !formData.startDate || !formData.endDate) return alert('Completa los campos')
    if ((isAdmin || isManager) && selectedRep === 'Todos') return alert('Selecciona un visitador específico para asignar esta ruta')
    
    setSaving(true)
    const targetEmail = (isAdmin || isManager) && selectedRep !== 'Todos' ? selectedRep : userEmail

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

  const handleDelete = async () => {
    if (!editingId || !window.confirm('¿Estás seguro de eliminar esta ruta del itinerario?')) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'itineraries', editingId));
      alert('¡Ruta eliminada correctamente!');
      resetForm();
      await fetchTrips();
    } catch (e) { 
      alert('Error al eliminar'); 
    } finally { 
      setSaving(false); 
    }
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
    setFormData({ 
      city: '', 
      startDate: now.toISOString().split('T')[0], 
      endDate: now.toISOString().split('T')[0], 
      startTime: '08:00', 
      endTime: '18:00', 
      observation: '' 
    })
  }

  const getTripForDay = (day: number) => {
    const currentDayStr = `${currentYear}-${currentMonthStr}-${day.toString().padStart(2, '0')}`
    return trips.find(t => currentDayStr >= t.startDate && currentDayStr <= t.endDate)
  }

  const days = Array.from({length: daysInMonth}, (_, i) => i + 1)
  
  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">Itinerario</h1>
          <p className="text-gray-500 font-medium text-sm mt-2 capitalize">{monthName} {currentYear} — Hoja de ruta mensual</p>
        </div>

        {(isAdmin || isManager) && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0"><Filter size={20}/></div>
            <div className="pr-3 w-full">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Auditando Ruta</p>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="w-full text-sm font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer appearance-none">
                {isAdmin ? (
                  <option value="Todos">-- Seleccionar Visitador --</option>
                ) : (
                  <>
                    <option value="Todos">-- Equipo --</option>
                    <option value={userEmail}>Mi Gestión Propia</option>
                  </>
                )}
                {repsList.map((email) => <option key={email} value={email}>{email}</option>)}
              </select>
            </div>
          </div>
        )}
      </header>

      {((isAdmin || isManager) && selectedRep === 'Todos') ? (
        <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-gray-200 text-center flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <CalendarDays className="text-gray-300" size={48} />
            </div>
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-2">Calendario en Pausa</h2>
            <p className="text-gray-500 font-medium text-sm max-w-sm">Para ver o gestionar un itinerario, por favor selecciona a un visitador específico desde el filtro superior.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FASE 3.0: Ocultamos el form si el Manager/Admin está viendo el calendario de OTRA persona */}
          {(isAdmin || userEmail === selectedRep || (!isAdmin && !isManager)) ? (
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
                
                <div className="flex flex-col gap-3 mt-2">
                  <button 
                    disabled={saving} 
                    onClick={handleSave} 
                    className={`w-full text-white text-[10px] font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${editingId ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : editingId ? 'Actualizar Itinerario' : 'Guardar itinerario'}
                  </button>

                  {editingId && (
                    <button 
                      disabled={saving} 
                      onClick={handleDelete} 
                      className="w-full text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> Eliminar Ruta
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Panel Informativo para Managers Viendo a Otro (Modo Solo Lectura)
            <div className="p-8 rounded-[40px] bg-indigo-50 border border-indigo-100 flex flex-col justify-center items-center text-center h-full">
               <User size={40} className="text-indigo-300 mb-4" />
               <h3 className="text-lg font-black uppercase text-indigo-900 leading-none mb-2">Modo Solo Lectura</h3>
               <p className="text-xs text-indigo-600 font-medium">Estás visualizando el itinerario de <span className="font-bold">{selectedRep}</span>. No puedes modificar sus rutas.</p>
            </div>
          )}

          <div className="lg:col-span-2">
            {loading ? (
              <div className="p-20 text-center font-black text-gray-300 animate-pulse">Sincronizando calendario...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-2.5">
                {days.map(d => {
                  const trip = getTripForDay(d);
                  // Solo permite click si es Admin o si es el dueño del calendario
                  const canEdit = isAdmin || userEmail === selectedRep || (!isAdmin && !isManager);
                  
                  return (
                    <div 
                      key={d} 
                      onClick={() => {
                        if (trip && canEdit) startEdit(trip)
                      }}
                      className={`${canEdit && trip ? 'cursor-pointer hover:border-blue-300' : ''} group p-3 lg:p-3 rounded-[28px] border transition-all min-h-[110px] lg:min-h-[130px] flex flex-col relative ${trip ? 'border-blue-500 ring-2 ring-blue-50 bg-blue-50/20' : 'border-gray-100 shadow-sm bg-white'}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-[11px] font-black ${trip ? 'text-blue-600' : 'text-gray-300'}`}>
                          {d.toString().padStart(2, '0')} / {currentMonthStr}
                        </span>
                        {trip && canEdit && <Edit3 size={10} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
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
