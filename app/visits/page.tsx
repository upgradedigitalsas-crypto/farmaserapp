'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Search, User, Filter, Calendar, Zap, Loader2, X, Lock, Pencil, Trash2 } from 'lucide-react'

const getFingerprintLocation = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ 
        lat: pos.coords.latitude, 
        lng: pos.coords.longitude, 
        accuracy: `${Math.round(pos.coords.accuracy)}m`,
        timestamp: new Date().toISOString() 
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
};

export default function PlanningPage() {
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  const [doctors, setDoctors] = useState<any[]>([])
  const [plannedVisits, setPlannedVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [visitDate, setVisitDate] = useState('2026-04-01')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [status, setStatus] = useState('Planeada')
  const [editingId, setEditingId] = useState<string | null>(null)

  const isAdmin = user?.email?.toLowerCase().trim() === 'entrenamientofarmaser@gmail.com'

  const fetchData = async () => {
    setLoading(true)
    try {
      const resDocs = await fetch('/api/doctors')
      const dataDocs = await resDocs.json()
      setDoctors(Array.isArray(dataDocs) ? dataDocs : [])
      const vRef = collection(db, 'planned_visits')
      const emailTarget = isAdmin ? selectedRep : user?.email?.toLowerCase().trim()
      const q = (isAdmin && selectedRep === 'Todos') ? query(vRef) : query(vRef, where('userEmail', '==', emailTarget))
      const snap = await getDocs(q)
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setPlannedVisits(all.filter((v: any) => v.visitDate?.includes('-04-')))
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [user, selectedRep])

  const repsList = useMemo(() => {
    if (!isAdmin) return []
    return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#'))))
  }, [doctors, isAdmin])

  const handleSaveVisit = async () => {
    if (!selectedDoctor || !visitDate) return alert('Datos incompletos')
    setSaving(true)
    try {
      const locationFingerprint = await getFingerprintLocation()
      const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase().trim()
      
      // Definimos el objeto de forma explícita para evitar el error de TypeScript
      const visitData: any = {
        userEmail: targetEmail,
        doctorName: selectedDoctor.name,
        doctorId: selectedDoctor.id || null,
        doctorDetails: {
          category: selectedDoctor.category || 'A',
          specialty: selectedDoctor.specialty,
          city: selectedDoctor.city,
          address: selectedDoctor.address || 'Principal'
        },
        visitDate,
        startTime,
        endTime,
        status,
        updatedAt: Timestamp.now()
      }

      // Si existe la ubicación, la agregamos al objeto de forma segura
      if (locationFingerprint) {
        visitData.locationFingerprint = locationFingerprint;
      }

      if (editingId) {
        await updateDoc(doc(db, 'planned_visits', editingId), visitData)
      } else {
        await addDoc(collection(db, 'planned_visits'), { ...visitData, createdAt: Timestamp.now() })
      }
      resetForm(); fetchData(); alert('Guardado con éxito')
    } catch (e) { alert('Error al guardar') } finally { setSaving(false) }
  }

  const handleDeleteVisit = async () => {
    if (!editingId || !window.confirm('¿Eliminar cita?')) return
    setSaving(true)
    try {
      await deleteDoc(doc(db, 'planned_visits', editingId))
      resetForm(); fetchData(); alert('Cita eliminada')
    } catch (e) { alert('Error al eliminar') } finally { setSaving(false) }
  }

  const startEdit = (v: any) => {
    setEditingId(v.id)
    setSelectedDoctor({ id: v.doctorId, name: v.doctorName, ...v.doctorDetails })
    setVisitDate(v.visitDate); setStartTime(v.startTime || ''); setEndTime(v.endTime || ''); setStatus(v.status)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null); setSelectedDoctor(null); setSearchTerm(''); setVisitDate('2026-04-01'); setStartTime(''); setEndTime('')
  }

  const myFullDocsList = useMemo(() => {
    const email = isAdmin ? (selectedRep === 'Todos' ? '' : selectedRep) : user?.email?.toLowerCase().trim()
    if (!email && isAdmin) return []
    const planned = new Set(plannedVisits.map(v => String(v.doctorName || '').toLowerCase().trim()))
    return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === email && !planned.has(String(d.name || '').toLowerCase().trim())).sort((a: any, b: any) => a.name.localeCompare(b.name))
  }, [doctors, user, selectedRep, isAdmin, plannedVisits])

  const myDocsFiltered = useMemo(() => {
    if (!searchTerm || selectedDoctor) return []
    const t = searchTerm.toLowerCase()
    return myFullDocsList.filter((d: any) => d.name?.toLowerCase().includes(t) || d.city?.toLowerCase().includes(t))
  }, [myFullDocsList, searchTerm, selectedDoctor])

  const days = Array.from({length: 30}, (_, i) => i + 1)

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic">Planeación</h1>
          <p className="text-gray-500 font-medium">Abril 2026</p>
        </div>
        {isAdmin && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border flex items-center gap-3">
            <Filter size={20} className="text-indigo-600 ml-2"/>
            <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold bg-transparent outline-none">
              <option value="Todos">Toda la Empresa</option>
              {repsList.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-10">
        {(!isAdmin || (isAdmin && selectedRep !== 'Todos')) && (
          <div className="w-full space-y-6">
            {!editingId && (
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                <select className="w-full bg-gray-50 border rounded-2xl py-4 px-5 text-sm font-bold" value={selectedDoctor?.id || ""} onChange={(e) => {
                  const docFound = myFullDocsList.find((d:any) => d.id === e.target.value)
                  if (docFound) { setSelectedDoctor(docFound); setSearchTerm(docFound.name) }
                }}>
                  <option value="">-- Seleccionar Médico --</option>
                  {myFullDocsList.map((docItem:any) => <option key={docItem.id} value={docItem.id}>{docItem.name} — {docItem.city}</option>)}
                </select>
                <div className="relative mt-6">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Buscar..." className="w-full bg-gray-50 border rounded-2xl py-4 pl-14 text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {searchTerm && !selectedDoctor && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {myDocsFiltered.map((docItem:any) => (
                      <button key={docItem.id} onClick={() => { setSelectedDoctor(docItem); setSearchTerm(docItem.name) }} className="w-full text-left p-4 bg-blue-50 rounded-2xl font-bold uppercase text-xs">
                        {docItem.name} <span className="text-blue-500">— {docItem.city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedDoctor && (
              <div className={`p-8 rounded-[40px] shadow-xl border-2 transition-all ${editingId ? 'bg-orange-50 border-orange-400' : 'bg-white border-blue-600'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}><User size={24} /></div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{selectedDoctor.name}</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedDoctor.specialty} | {selectedDoctor.city}</p>
                    </div>
                  </div>
                  <button onClick={resetForm} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={16}/></button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full bg-white border rounded-xl py-3 px-4 text-xs font-bold shadow-sm" />
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-white border rounded-xl py-3 px-4 text-xs font-bold shadow-sm">
                    <option value="Planeada">Planeada</option>
                    <option value="Realizada">Realizada</option>
                    <option value="Reagendada">Reagendada</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-white border rounded-xl py-3 px-4 text-xs font-bold shadow-sm" />
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-white border rounded-xl py-3 px-4 text-xs font-bold shadow-sm" />
                </div>
                <button disabled={saving} onClick={handleSaveVisit} className={`w-full text-white text-[10px] font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 ${editingId ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : editingId ? 'Actualizar Cita' : 'Agendar Cita'}
                </button>
                {editingId && (
                  <button onClick={handleDeleteVisit} className="w-full mt-3 text-red-600 bg-red-50 py-3 rounded-xl text-[10px] font-bold uppercase">Eliminar Cita</button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-3">
            {days.map(d => {
              const currentDStr = `2026-04-${d.toString().padStart(2, '0')}`
              const visitsOnDay = plannedVisits.filter(v => v.visitDate === currentDStr)
              return (
                <div key={d} className={`bg-white p-3 lg:p-4 rounded-[30px] border transition-all min-h-[120px] lg:min-h-[150px] flex flex-col relative ${visitsOnDay.length > 0 ? 'border-blue-500 ring-2 ring-blue-50 bg-blue-50/20' : 'border-gray-100 shadow-sm'}`}>
                  <span className={`text-[11px] font-black mb-2 ${visitsOnDay.length > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{d.toString().padStart(2, '0')} / 04</span>
                  <div className="flex flex-col gap-1.5">
                    {visitsOnDay.map((v, idx) => (
                      <button key={idx} onClick={() => startEdit(v)} className="group bg-blue-600 text-white p-1.5 rounded-lg text-left px-2 flex justify-between items-center hover:bg-blue-700">
                        <div className="flex flex-col truncate flex-1">
                          <span className="text-[9px] font-black uppercase truncate">{v.doctorName}</span>
                          {(v.startTime || v.endTime) && <span className="text-[6.5px] text-blue-200">{v.startTime || '--:--'} {v.endTime ? `- ${v.endTime}` : ''}</span>}
                        </div>
                        <Pencil size={8} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
