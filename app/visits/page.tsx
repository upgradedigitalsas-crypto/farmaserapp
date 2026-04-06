'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore'
import { Search, User, Filter, Calendar, Zap, Loader2, X, Lock, Pencil } from 'lucide-react'

export default function PlanningPage() {
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  const [doctors, setDoctors] = useState<any[]>([])
  const [plannedVisits, setPlannedVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  
  const [visitDate, setVisitDate] = useState('2026-04-01')
  const [status, setStatus] = useState('Planeada')
  const [editingId, setEditingId] = useState<string | null>(null)

  const isAdmin = user?.email?.toLowerCase().trim() === 'entrenamientofarmaser@gmail.com'

  const fetchData = async () => {
    setLoading(true)
    try {
      const resDocs = await fetch('/api/doctors')
      const dataDocs = await resDocs.json()
      setDoctors(Array.isArray(dataDocs) ? dataDocs : [])

      let q;
      const visitsRef = collection(db, 'planned_visits');
      
      // FIX: Quitamos orderBy de Firebase para evitar error de Índice Compuesto
      if (isAdmin && selectedRep === 'Todos') {
        q = query(visitsRef); 
      } else {
        const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase().trim();
        q = query(visitsRef, where('userEmail', '==', targetEmail));
      }

      const querySnapshot = await getDocs(q)
      let allVisits = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // FIX: Ordenamos por fecha usando JavaScript en memoria
      allVisits.sort((a: any, b: any) => (a.visitDate || '').localeCompare(b.visitDate || ''));

      setPlannedVisits(allVisits.filter((v: any) => v.visitDate?.includes('-04-')));
    } catch (e) { 
      console.error(e) 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { fetchData() }, [user, selectedRep])

  const repsList = useMemo(() => {
    if (!isAdmin) return []
    return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#'))))
  }, [doctors, isAdmin])

  const handleSaveVisit = async () => {
    if (!selectedDoctor || !visitDate) return alert('Datos incompletos')
    if (isAdmin && selectedRep === 'Todos') return alert('Selecciona un visitador específico para agendarle una cita')
    
    setSaving(true)
    try {
      const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase().trim();
      
      const newVisitData = {
        userEmail: targetEmail,
        doctorName: selectedDoctor.name,
        doctorId: selectedDoctor.id,
        doctorDetails: {
          category: selectedDoctor.category || 'A',
          specialty: selectedDoctor.specialty,
          city: selectedDoctor.city,
          address: selectedDoctor.address || 'Principal'
        },
        visitDate,
        status,
        updatedAt: Timestamp.now()
      };

      if (editingId) {
        const docRef = doc(db, 'planned_visits', editingId)
        await updateDoc(docRef, newVisitData)
        setPlannedVisits(prev => prev.map(v => v.id === editingId ? { ...v, ...newVisitData } : v).sort((a: any, b: any) => a.visitDate.localeCompare(b.visitDate)));
        alert('Planeación actualizada')
      } else {
        const docRef = await addDoc(collection(db, 'planned_visits'), { ...newVisitData, createdAt: Timestamp.now() })
        setPlannedVisits(prev => [...prev, { id: docRef.id, ...newVisitData }].sort((a: any, b: any) => a.visitDate.localeCompare(b.visitDate)));
        alert('Visita agendada')
      }
      resetForm()
      fetchData()
    } catch (e) { alert('Error al procesar') } finally { setSaving(false) }
  }

  const startEdit = (visit: any) => {
    setEditingId(visit.id)
    setSelectedDoctor({ id: visit.doctorId, name: visit.doctorName, ...visit.doctorDetails })
    setVisitDate(visit.visitDate)
    setStatus(visit.status)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null)
    setSelectedDoctor(null)
    setSearchTerm('')
    setVisitDate('2026-04-01')
  }

  const myDocsFiltered = useMemo(() => {
    const targetEmail = isAdmin ? (selectedRep === 'Todos' ? '' : selectedRep) : user?.email?.toLowerCase().trim();
    if (!targetEmail && isAdmin) return [];

    const base = doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === targetEmail)
    if (!searchTerm || selectedDoctor) return []
    return base.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5)
  }, [doctors, user, searchTerm, selectedDoctor, selectedRep, isAdmin])

  const getVisitsForDay = (day: number) => {
    const currentDayStr = `2026-04-${day.toString().padStart(2, '0')}`
    return plannedVisits.filter(v => v.visitDate === currentDayStr)
  }

  const days = Array.from({length: 30}, (_, i) => i + 1)

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic">Planeación</h1>
          <p className="text-gray-500 font-medium">Abril 2026 — Gestión de agenda mensual</p>
        </div>

        {isAdmin && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600"><Filter size={20}/></div>
            <div className="pr-3">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Auditando Agenda</p>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer appearance-none">
                <option value="Todos">Toda la Empresa</option>
                {repsList.map((email) => <option key={email} value={email}>{email}</option>)}
              </select>
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-10">
        {(!isAdmin || (isAdmin && selectedRep !== 'Todos')) && (
          <div className="w-full space-y-6">
            {!editingId && (
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                <label className="text-[10px] font-black uppercase text-gray-400 mb-4 block ml-2">Buscar médico en cartera de {isAdmin ? selectedRep : 'mi usuario'}</label>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Escribe nombre del médico..." className="w-full bg-gray-50 border-none rounded-2xl py-5 pl-14 pr-6 text-sm font-bold focus:ring-2 focus:ring-blue-600" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {searchTerm && (
                  <div className="mt-4 space-y-2">
                    {myDocsFiltered.map((doc) => (
                      <button key={doc.id} onClick={() => { setSelectedDoctor(doc); setSearchTerm(doc.name); }} className="w-full text-left p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl transition-all font-bold uppercase text-xs">{doc.name} — {doc.city}</button>
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
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-1">Fecha</label>
                    <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full bg-white border-none rounded-xl py-3 px-4 text-xs font-bold shadow-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-1">Estado</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-white border-none rounded-xl py-3 px-4 text-xs font-bold shadow-sm">
                      <option value="Planeada">Planeada</option>
                      <option value="Realizada">Realizada</option>
                      <option value="Reagendada">Reagendada</option>
                    </select>
                  </div>
                </div>
                <button disabled={saving} onClick={handleSaveVisit} className={`w-full text-white text-[10px] font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 ${editingId ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : editingId ? 'Actualizar Cita' : 'Agendar Cita'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-3">
            {days.map(d => {
              const visits = getVisitsForDay(d);
              return (
                <div key={d} className={`bg-white p-3 lg:p-4 rounded-[30px] border transition-all min-h-[120px] lg:min-h-[150px] flex flex-col relative ${visits.length > 0 ? 'border-blue-500 ring-2 ring-blue-50 bg-blue-50/20' : 'border-gray-100 shadow-sm'}`}>
                  <span className={`text-[11px] font-black mb-2 ${visits.length > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{d.toString().padStart(2, '0')} / 04</span>
                  <div className="flex flex-col gap-1.5">
                    {visits.map((v, idx) => (
                      <button key={idx} onClick={() => startEdit(v)} className="group bg-blue-600 text-white text-[9px] lg:text-[7.5px] font-black uppercase p-1.5 lg:p-1 rounded-lg shadow-sm text-left px-2 leading-tight flex justify-between items-center hover:bg-blue-700 transition-all">
                        <span className="truncate flex-1">{v.doctorName}</span>
                        <Pencil size={8} className="opacity-0 group-hover:opacity-100 ml-1" />
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
EOF~
cat app/dashboard/page.tsx
cat << 'EOF' > app/visits/page.tsx
'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore'
import { Search, User, Filter, Calendar, Zap, Loader2, X, Lock, Pencil } from 'lucide-react'

export default function PlanningPage() {
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  const [doctors, setDoctors] = useState<any[]>([])
  const [plannedVisits, setPlannedVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  
  const [visitDate, setVisitDate] = useState('2026-04-01')
  const [status, setStatus] = useState('Planeada')
  const [editingId, setEditingId] = useState<string | null>(null)

  const isAdmin = user?.email?.toLowerCase().trim() === 'entrenamientofarmaser@gmail.com'

  const fetchData = async () => {
    setLoading(true)
    try {
      const resDocs = await fetch('/api/doctors')
      const dataDocs = await resDocs.json()
      setDoctors(Array.isArray(dataDocs) ? dataDocs : [])

      let q;
      const visitsRef = collection(db, 'planned_visits');
      
      // FIX: Quitamos orderBy de Firebase
      if (isAdmin && selectedRep === 'Todos') {
        q = query(visitsRef); 
      } else {
        const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase().trim();
        q = query(visitsRef, where('userEmail', '==', targetEmail));
      }

      const querySnapshot = await getDocs(q)
      let allVisits = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // FIX: Ordenamos por fecha en memoria
      allVisits.sort((a: any, b: any) => (a.visitDate || '').localeCompare(b.visitDate || ''));

      setPlannedVisits(allVisits.filter((v: any) => v.visitDate?.includes('-04-')));
    } catch (e) { 
      console.error(e) 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { fetchData() }, [user, selectedRep])

  const repsList = useMemo(() => {
    if (!isAdmin) return []
    return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#'))))
  }, [doctors, isAdmin])

  const handleSaveVisit = async () => {
    if (!selectedDoctor || !visitDate) return alert('Datos incompletos')
    if (isAdmin && selectedRep === 'Todos') return alert('Selecciona un visitador específico para agendarle una cita')
    
    setSaving(true)
    try {
      const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase().trim();
      
      const newVisitData = {
        userEmail: targetEmail,
        doctorName: selectedDoctor.name,
        doctorId: selectedDoctor.id,
        doctorDetails: {
          category: selectedDoctor.category || 'A',
          specialty: selectedDoctor.specialty,
          city: selectedDoctor.city,
          address: selectedDoctor.address || 'Principal'
        },
        visitDate,
        status,
        updatedAt: Timestamp.now()
      };

      if (editingId) {
        const docRef = doc(db, 'planned_visits', editingId)
        await updateDoc(docRef, newVisitData)
        setPlannedVisits(prev => prev.map(v => v.id === editingId ? { ...v, ...newVisitData } : v).sort((a: any, b: any) => a.visitDate.localeCompare(b.visitDate)));
        alert('Planeación actualizada')
      } else {
        const docRef = await addDoc(collection(db, 'planned_visits'), { ...newVisitData, createdAt: Timestamp.now() })
        setPlannedVisits(prev => [...prev, { id: docRef.id, ...newVisitData }].sort((a: any, b: any) => a.visitDate.localeCompare(b.visitDate)));
        alert('Visita agendada')
      }
      resetForm()
      fetchData()
    } catch (e) { alert('Error al procesar') } finally { setSaving(false) }
  }

  const startEdit = (visit: any) => {
    setEditingId(visit.id)
    setSelectedDoctor({ id: visit.doctorId, name: visit.doctorName, ...visit.doctorDetails })
    setVisitDate(visit.visitDate)
    setStatus(visit.status)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null)
    setSelectedDoctor(null)
    setSearchTerm('')
    setVisitDate('2026-04-01')
  }

  const myDocsFiltered = useMemo(() => {
    const targetEmail = isAdmin ? (selectedRep === 'Todos' ? '' : selectedRep) : user?.email?.toLowerCase().trim();
    if (!targetEmail && isAdmin) return [];

    const base = doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === targetEmail)
    if (!searchTerm || selectedDoctor) return []
    return base.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5)
  }, [doctors, user, searchTerm, selectedDoctor, selectedRep, isAdmin])

  const getVisitsForDay = (day: number) => {
    const currentDayStr = `2026-04-${day.toString().padStart(2, '0')}`
    return plannedVisits.filter(v => v.visitDate === currentDayStr)
  }

  const days = Array.from({length: 30}, (_, i) => i + 1)

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic">Planeación</h1>
          <p className="text-gray-500 font-medium">Abril 2026 — Gestión de agenda mensual</p>
        </div>

        {isAdmin && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600"><Filter size={20}/></div>
            <div className="pr-3">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Auditando Agenda</p>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer appearance-none">
                <option value="Todos">Toda la Empresa</option>
                {repsList.map((email) => <option key={email} value={email}>{email}</option>)}
              </select>
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-10">
        {(!isAdmin || (isAdmin && selectedRep !== 'Todos')) && (
          <div className="w-full space-y-6">
            {!editingId && (
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                <label className="text-[10px] font-black uppercase text-gray-400 mb-4 block ml-2">Buscar médico en cartera de {isAdmin ? selectedRep : 'mi usuario'}</label>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Escribe nombre del médico..." className="w-full bg-gray-50 border-none rounded-2xl py-5 pl-14 pr-6 text-sm font-bold focus:ring-2 focus:ring-blue-600" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {searchTerm && (
                  <div className="mt-4 space-y-2">
                    {myDocsFiltered.map((doc) => (
                      <button key={doc.id} onClick={() => { setSelectedDoctor(doc); setSearchTerm(doc.name); }} className="w-full text-left p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl transition-all font-bold uppercase text-xs">{doc.name} — {doc.city}</button>
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
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-1">Fecha</label>
                    <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full bg-white border-none rounded-xl py-3 px-4 text-xs font-bold shadow-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-1">Estado</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-white border-none rounded-xl py-3 px-4 text-xs font-bold shadow-sm">
                      <option value="Planeada">Planeada</option>
                      <option value="Realizada">Realizada</option>
                      <option value="Reagendada">Reagendada</option>
                    </select>
                  </div>
                </div>
                <button disabled={saving} onClick={handleSaveVisit} className={`w-full text-white text-[10px] font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 ${editingId ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : editingId ? 'Actualizar Cita' : 'Agendar Cita'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-3">
            {days.map(d => {
              const visits = getVisitsForDay(d);
              return (
                <div key={d} className={`bg-white p-3 lg:p-4 rounded-[30px] border transition-all min-h-[120px] lg:min-h-[150px] flex flex-col relative ${visits.length > 0 ? 'border-blue-500 ring-2 ring-blue-50 bg-blue-50/20' : 'border-gray-100 shadow-sm'}`}>
                  <span className={`text-[11px] font-black mb-2 ${visits.length > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{d.toString().padStart(2, '0')} / 04</span>
                  <div className="flex flex-col gap-1.5">
                    {visits.map((v, idx) => (
                      <button key={idx} onClick={() => startEdit(v)} className="group bg-blue-600 text-white text-[9px] lg:text-[7.5px] font-black uppercase p-1.5 lg:p-1 rounded-lg shadow-sm text-left px-2 leading-tight flex justify-between items-center hover:bg-blue-700 transition-all">
                        <span className="truncate flex-1">{v.doctorName}</span>
                        <Pencil size={8} className="opacity-0 group-hover:opacity-100 ml-1" />
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
