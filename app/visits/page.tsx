'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Search, User, Filter, Calendar, Zap, Loader2, X, Lock, Pencil, Trash2 } from 'lucide-react'

// Función auxiliar para capturar ubicación de forma segura y silenciosa
const getFingerprintLocation = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return resolve(null);
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: `${Math.round(position.coords.accuracy)}m`,
          timestamp: new Date().toISOString()
        });
      },
      () => resolve(null), // Si el usuario niega o hay error, devolvemos null y seguimos
      { enableHighAccuracy: true, timeout: 3000 } // Máximo 3 segundos de espera
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

      let q;
      const visitsRef = collection(db, 'planned_visits');
      
      if (isAdmin && selectedRep === 'Todos') {
        q = query(visitsRef); 
      } else {
        const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase().trim();
        q = query(visitsRef, where('userEmail', '==', targetEmail));
      }

      const querySnapshot = await getDocs(q)
      let allVisits = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
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
      // CAPTURA DE HUELLA DE UBICACIÓN
      const locationFingerprint = await getFingerprintLocation();

      const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase().trim();
      
      const newVisitData = {
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
        updatedAt: Timestamp.now(),
        // Insertamos la huella solo si se obtuvo
        ...(locationFingerprint && { locationFingerprint })
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

  const handleDeleteVisit = async () => {
    if (!editingId) return;
    const confirmDelete = window.confirm('¿Estás seguro?');
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'planned_visits', editingId));
      setPlannedVisits(prev => prev.filter(v => v.id !== editingId));
      alert('Eliminada');
      resetForm();
      fetchData();
    } catch (e) { alert('Error'); } finally { setSaving(false); }
  }

  const startEdit = (visit: any) => {
    setEditingId(visit.id)
    setSelectedDoctor({ id: visit.doctorId, name: visit.doctorName, ...visit.doctorDetails })
    setVisitDate(visit.visitDate)
    setStartTime(visit.startTime || '')
    setEndTime(visit.endTime || '')
    setStatus(visit.status)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null)
    setSelectedDoctor(null)
    setSearchTerm('')
    setVisitDate('2026-04-01')
    setStartTime('')
    setEndTime('')
  }

  const myFullDocsList = useMemo(() => {
    const targetEmail = isAdmin ? (selectedRep === 'Todos' ? '' : selectedRep) : user?.email?.toLowerCase().trim();
    if (!targetEmail && isAdmin) return [];
    const plannedNames = new Set(plannedVisits.map(v => String(v.doctorName || '').toLowerCase().trim()));
    const base = doctors.filter((d: any) => {
      const isAssignedToMe = String(d.assignedTo || '').toLowerCase().trim() === targetEmail;
      const isNotPlannedYet = !plannedNames.has(String(d.name || '').toLowerCase().trim());
      return isAssignedToMe && isNotPlannedYet;
    });
    return base.sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [doctors, user, selectedRep, isAdmin, plannedVisits]);

  const myDocsFiltered = useMemo(() => {
    if (!searchTerm || selectedDoctor) return [];
    const term = searchTerm.toLowerCase();
    return myFullDocsList.filter((d: any) => 
      d.name?.toLowerCase().includes(term) || d.city?.toLowerCase().includes(term)
    );
  }, [myFullDocsList, searchTerm, selectedDoctor]);

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
          <p className="text-gray-500 font-medium">Abril 2026</p>
        </div>
        {isAdmin && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <Filter size={20} className="text-indigo-600 ml-2"/>
            <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none pr-4">
              <option value="Todos">Toda la Empresa</option>
              {repsList.map((email) => <option key={email} value={email}>{email}</option>)}
            </select>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-10">
        {(!isAdmin || (isAdmin && selectedRep !== 'Todos')) && (
          <div className="w-full space-y-6">
            {!editingId && (
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                <label className="text-[10px] font-black uppercase text-gray-400 mb-3 block">Cartera pendiente</label>
                <select
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 text-sm font-bold text-gray-700"
                  value={selectedDoctor?.id || ""}
                  onChange={(e) => {
                    const doc = myFullDocsList.find((d:any) => d.id === e.target.value);
                    if (doc) { setSelectedDoctor(doc); setSearchTerm(doc.name); }
                  }}
                >
                  <option value="">-- Seleccionar Médico --</option>
                  {myFullDocsList.map((doc:any) => (
                    <option key={doc.id} value={doc.id}>{doc.name} — {doc.city}</option>
                  ))}
                </select>

                <div className="relative mt-6">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Buscar..." className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {searchTerm && !selectedDoctor && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {myDocsFiltered.map((doc:any) => (
                      <button key={doc.id} onClick={() => { setSelectedDoctor(doc); setSearchTerm(doc.name); }} className="w-full text-left p-4 bg-blue-50 border border-blue-100 rounded-2xl font-bold uppercase text-xs">
                        {doc.name} <span className="text-blue-500">— {doc.city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedDoctor && (
              <div className={`p-8 rounded-[40px] shadow-xl border-2 ${editingId ? 'bg-orange-50 border-orange-400' : 'bg-white border-blue-600'}`}>
                <div className="flex justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{selectedDoctor.name}</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedDoctor.specialty} | {selectedDoctor.city}</p>
                  </div>
                  <button onClick={resetForm} className="p-2 bg-gray-100 rounded-full"><X size={16}/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="bg-gray-50 rounded-xl p-3 text-xs font-bold" />
                  <select value={status} onChange={e => setStatus(e.target.value)} className="bg-gray-50 rounded-xl p-3 text-xs font-bold">
                    <option value="Planeada">Planeada</option>
                    <option value="Realizada">Realizada</option>
                    <option value="Reagendada">Reagendada</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-gray-50 rounded-xl p-3 text-xs font-bold" />
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-gray-50 rounded-xl p-3 text-xs font-bold" />
                </div>
                
                <button disabled={saving} onClick={handleSaveVisit} className={`w-full text-white text-[10px] font-black uppercase py-5 rounded-2xl shadow-lg ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}>
                  {saving ? <Loader2 className="animate-spin m-auto" size={18} /> : editingId ? 'Actualizar Cita' : 'Agendar Cita'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {days.map(d => {
              const visits = getVisitsForDay(d);
              return (
                <div key={d} className={`bg-white p-3 rounded-[20px] border min-h-[120px] flex flex-col ${visits.length > 0 ? 'border-blue-500 bg-blue-50/20' : 'border-gray-100'}`}>
                  <span className="text-[11px] font-black mb-2 text-gray-300">{d.toString().padStart(2, '0')}</span>
                  {visits.map((v, idx) => (
                    <button key={idx} onClick={() => startEdit(v)} className="bg-blue-600 text-white p-1.5 rounded-lg mb-1 text-[9px] font-black uppercase truncate flex justify-between items-center">
                      {v.doctorName} <Pencil size={8} />
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
