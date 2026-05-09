'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore, TEAM_MAPPING } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore'
// Añadimos 'Download' a los iconos importados
import { Clock, Loader2, X, Edit3, Filter, MapPin, CalendarDays, Trash2, User, Download } from 'lucide-react'
import { downloadCSV } from '@/lib/downloadCSV'

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
    if (isAdmin || isManager) {
      fetch('/api/doctors').then(res => res.json()).then(data => {
        setDoctors(Array.isArray(data) ? data : [])
      })
    }
  }, [isAdmin, isManager])

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
    
    if ((isAdmin || isManager) && selectedRep === 'Todos') {
      setTrips([])
      setLoading(false)
      return
    }

    if (!targetEmail) return;

    setLoading(true)
    try {
      const q = query(
        collection(db, 'itineraries'), 
        where('userEmail', '==', targetEmail)
      )
      const querySnapshot = await getDocs(q)
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      
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
    if ((isAdmin || isManager) && selectedRep === 'Todos') return alert('Selecciona un visitador específico')
    
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
    if (!editingId || !window.confirm('¿Eliminar esta ruta del itinerario?')) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'itineraries', editingId));
      alert('¡Ruta eliminada!');
      resetForm();
      await fetchTrips();
    } catch (e) { alert('Error al eliminar'); } finally { setSaving(false); }
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

  // === FUNCIÓN EXPORTAR A EXCEL ===
  const exportCSV = async () => {
    let dataToExport = trips;

    if ((isAdmin || isManager) && selectedRep === 'Todos') {
      try {
        const snap = await getDocs(collection(db, 'itineraries'));
        let all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (isManager) {
          const myTeam = TEAM_MAPPING[userEmail] || [];
          all = all.filter((t: any) => myTeam.includes(String(t.userEmail || '').toLowerCase().trim()));
        }
        dataToExport = all.filter((t: any) => t.startDate?.includes(filterKey) || t.endDate?.includes(filterKey));
      } catch (e) {
        alert('Error al obtener datos');
        return;
      }
    }

    if (dataToExport.length === 0) return alert('No hay rutas en el itinerario para exportar.');
    let csv = "Ciudad,Fecha Inicio,Fecha Fin,Hora Inicio,Hora Fin,Observaciones,Visitador\n";
    dataToExport.forEach((t: any) => {
      const obs = t.observation ? String(t.observation).replace(/"/g, '""') : '';
      csv += `"${t.city || ''}",${t.startDate || ''},${t.endDate || ''},${t.startTime || '--:--'},${t.endTime || '--:--'},"${obs}","${t.userEmail || ''}"\n`;
    });
    await downloadCSV(csv, `Itinerario_${monthName}_${currentYear}.csv`)
  }

  const getTripForDay = (day: number) => {
    const currentDayStr = `${currentYear}-${currentMonthStr}-${day.toString().padStart(2, '0')}`
    return trips.find(t => currentDayStr >= t.startDate && currentDayStr <= t.endDate)
  }

  const days = Array.from({length: daysInMonth}, (_, i) => i + 1)
  
  return (
    <div className="p-4 pt-20 lg:p-10 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F5F5F7]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Itinerario</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{monthName} {currentYear} · Hoja de ruta mensual</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {(isAdmin || isManager) && (
            <div className="bg-white px-3 py-2.5 rounded-2xl shadow-sm border border-black/[0.06] flex items-center gap-2.5 w-full sm:w-auto">
              <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 shrink-0"><Filter size={15}/></div>
              <div className="pr-2 w-full">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Visitador</p>
                <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="w-full text-sm font-semibold text-gray-800 bg-transparent border-none outline-none cursor-pointer pr-4">
                  {isAdmin ? (
                    <option value="Todos">Seleccionar visitador</option>
                  ) : (
                    <>
                      <option value="Todos">Equipo</option>
                      <option value={userEmail}>Mi Gestión Propia</option>
                    </>
                  )}
                  {repsList.map((email) => <option key={email} value={email}>{email}</option>)}
                </select>
              </div>
            </div>
          )}
          <button onClick={exportCSV} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98]">
            <Download size={14}/> Descargar Excel
          </button>
        </div>
      </header>

      {((isAdmin || isManager) && selectedRep === 'Todos') ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-16 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <CalendarDays className="text-gray-300" size={32} />
          </div>
          <h2 className="text-base font-semibold text-gray-700 mb-1">Selecciona un visitador</h2>
          <p className="text-sm text-gray-400 max-w-xs">Elige un visitador específico en el filtro superior para ver su itinerario.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Formulario */}
          {(!isAdmin && !isManager) || (selectedRep === userEmail) || isAdmin ? (
            <div className={`p-6 rounded-2xl shadow-sm border transition-all h-fit ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-white border-black/[0.06]'}`}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-semibold text-gray-900">
                  {editingId ? 'Editar viaje' : 'Nueva ruta'}
                </h3>
                {editingId && (
                  <button onClick={resetForm} className="p-1.5 bg-white rounded-lg text-orange-400 shadow-sm hover:bg-orange-100">
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ciudad de destino..." className="w-full bg-gray-50 border-0 rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white" />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block ml-1">Salida</label>
                    <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-gray-50 border-0 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:ring-4 focus:ring-blue-500/10" />
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
                    {saving ? <Loader2 className="animate-spin" size={18} /> : editingId ? 'Actualizar Itinerario' : 'Guardar Itinerario'}
                  </button>
                  {editingId && (
                     <button onClick={handleDelete} className="text-red-500 font-bold text-[10px] uppercase py-2">Eliminar Viaje</button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 flex flex-col items-center justify-center text-center">
               <User className="text-gray-200 mb-4" size={48} />
               <p className="text-gray-400 font-bold text-xs uppercase">Estás auditando a:</p>
               <p className="text-blue-600 font-black text-sm truncate w-full">{selectedRep}</p>
               <p className="mt-4 text-[10px] text-gray-300 font-medium leading-relaxed italic italic">Modo lectura activa para gerencia.</p>
            </div>
          )}

          {/* Calendario con Estilo Visual Restaurado */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2 lg:gap-3">
              {days.map(d => {
                const trip = getTripForDay(d)
                return (
                  <div
                    key={d}
                    className={`min-h-[88px] md:min-h-[120px] p-2.5 md:p-3 rounded-[28px] border-2 transition-all flex flex-col relative overflow-hidden ${
                      trip ? 'border-blue-600 bg-white shadow-xl scale-[1.02] z-10' : 'bg-white border-gray-100 shadow-sm'
                    }`}
                  >
                    <span className={`text-[10px] font-black mb-2 ${trip ? 'text-blue-600' : 'text-gray-300'}`}>
                      {d.toString().padStart(2, '0')}
                    </span>
                    
                    {trip && (
                      <button 
                        onClick={() => ((isAdmin || userEmail === selectedRep || (!isAdmin && !isManager)) && startEdit(trip))} 
                        className="flex-1 flex flex-col items-center justify-center text-center w-full"
                      >
                        {/* Píldora de Ciudad Sólida Azul */}
                        <div className="bg-blue-600 px-3 py-1.5 rounded-full shadow-md w-full mb-2">
                          <p className="text-[9px] font-black text-white uppercase truncate">
                            {trip.city}
                          </p>
                        </div>
                        
                        {/* Horario con Icono */}
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock size={10} className="text-blue-500 shrink-0" />
                          <span className="text-[8px] font-black whitespace-nowrap">
                            {trip.startTime} - {trip.endTime}
                          </span>
                        </div>
                      </button>
                    )}
                    
                    {trip && <div className="absolute -right-1 -bottom-1 opacity-[0.03] text-blue-900"><MapPin size={48} /></div>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}