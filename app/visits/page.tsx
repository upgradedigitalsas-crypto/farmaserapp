'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore'
import { Search, User, Filter, MapPin, Star, Tag, Loader2, X, Pencil, Phone, Download, MessageSquare } from 'lucide-react'

// === LÓGICA AUTOMÁTICA DE FECHAS ===
const now = new Date();
const currentMonthStr = (now.getMonth() + 1).toString().padStart(2, '0');
const currentYear = now.getFullYear();
const monthName = now.toLocaleString('es-ES', { month: 'long' });
const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
const filterKey = `${currentYear}-${currentMonthStr}`;

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

const normalizeStr = (str: string) => {
  if (!str) return '';
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export default function PlanningPage() {
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  const [doctors, setDoctors] = useState<any[]>([])
  const [plannedVisits, setPlannedVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [lastComment, setLastComment] = useState<string | null>(null) // NUEVO: Estado para el seguimiento
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const [visitDate, setVisitDate] = useState(now.toISOString().split('T')[0])
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
      setPlannedVisits(all.filter((v: any) => v.visitDate?.includes(filterKey)))
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [user, selectedRep])

  // === LÓGICA PARA BUSCAR EL ÚLTIMO COMENTARIO (UX) ===
  useEffect(() => {
    if (!selectedDoctor) {
      setLastComment(null);
      return;
    }
    const fetchLastComment = async () => {
      try {
        const q = query(
          collection(db, 'visit_reports'),
          where('doctorName', '==', selectedDoctor.name),
          orderBy('reportedAt', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setLastComment(snap.docs[0].data().observations);
        } else {
          setLastComment(null);
        }
      } catch (e) {
        console.error("Error buscando último seguimiento:", e);
      }
    };
    fetchLastComment();
  }, [selectedDoctor]);

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
      const visitData: any = {
        userEmail: targetEmail,
        doctorName: selectedDoctor.name,
        doctorId: selectedDoctor.id || null,
        doctorDetails: {
          category: selectedDoctor.category || '',
          specialty: selectedDoctor.specialty || '',
          city: selectedDoctor.city || '',
          address: selectedDoctor.address || '',
          phone: selectedDoctor.phone || '' 
        },
        visitDate,
        startTime,
        endTime,
        status,
        updatedAt: Timestamp.now()
      }
      if (locationFingerprint) visitData.locationFingerprint = locationFingerprint;
      if (editingId) await updateDoc(doc(db, 'planned_visits', editingId), visitData)
      else await addDoc(collection(db, 'planned_visits'), { ...visitData, createdAt: Timestamp.now() })
      clearFilters(); resetForm(); fetchData(); alert('Guardado con éxito')
    } catch (e) { alert('Error al guardar') } finally { setSaving(false) }
  }

  const handleDeleteVisit = async () => {
    if (!editingId || !window.confirm('¿Eliminar cita?')) return
    setSaving(true)
    try {
      await deleteDoc(doc(db, 'planned_visits', editingId))
      clearFilters(); resetForm(); fetchData(); alert('Cita eliminada')
    } catch (e) { alert('Error al eliminar') } finally { setSaving(false) }
  }

  const startEdit = (v: any) => {
    setEditingId(v.id)
    const freshDoctor = doctors.find(d => {
      const isGenericId = !d.id || d.id.includes('SIN CODIGO');
      if (!isGenericId) return d.id === v.doctorId;
      return normalizeStr(d.name) === normalizeStr(v.doctorName) && 
             normalizeStr(d.city) === normalizeStr(v.doctorDetails?.city);
    });
    if (freshDoctor) setSelectedDoctor({ ...freshDoctor, name: v.doctorName });
    else setSelectedDoctor({ id: v.doctorId, name: v.doctorName, ...v.doctorDetails });
    setVisitDate(v.visitDate); setStartTime(v.startTime || ''); setEndTime(v.endTime || ''); setStatus(v.status)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null); setSelectedDoctor(null); setVisitDate(now.toISOString().split('T')[0]); setStartTime(''); setEndTime('')
  }

  const clearFilters = () => {
    setSearchTerm(''); setFilterCity(''); setFilterSpecialty(''); setFilterCategory('');
  }

  const exportCSV = () => {
    if (plannedVisits.length === 0) return alert('No hay citas agendadas para exportar.');
    let csv = "Fecha,Visitador,Medico,Especialidad,Ciudad,Estado,Hora Inicio,Hora Fin\n";
    plannedVisits.forEach(v => {
      csv += `${v.visitDate || ''},${v.userEmail || ''},"${v.doctorName || ''}","${v.doctorDetails?.specialty || ''}","${v.doctorDetails?.city || ''}",${v.status || ''},${v.startTime || '--:--'},${v.endTime || '--:--'}\n`;
    });
    const csvContent = "\uFEFF" + csv;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Planeacion_${monthName}_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const myFullDocsList = useMemo(() => {
    const email = isAdmin ? (selectedRep === 'Todos' ? '' : selectedRep) : user?.email?.toLowerCase().trim()
    if (!email && isAdmin) return []
    return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === email).sort((a: any, b: any) => a.name.localeCompare(b.name))
  }, [doctors, user, selectedRep, isAdmin])

  const citiesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.city).filter(Boolean))).sort(), [myFullDocsList])
  const specialtiesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.specialty).filter(Boolean))).sort(), [myFullDocsList])
  const categoriesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.category).filter(Boolean))).sort(), [myFullDocsList])

  const myDocsFiltered = useMemo(() => {
    if (selectedDoctor) return [];
    if (!searchTerm.trim() && !filterCity && !filterSpecialty && !filterCategory) return [];
    let filtered = myFullDocsList;
    if (filterCity) filtered = filtered.filter(d => d.city === filterCity);
    if (filterSpecialty) filtered = filtered.filter(d => d.specialty === filterSpecialty);
    if (filterCategory) filtered = filtered.filter(d => d.category === filterCategory);
    if (searchTerm.trim()) {
      const searchWords = normalizeStr(searchTerm).split(/\s+/).filter(w => w.length > 0);
      filtered = filtered.filter(d => {
        const docName = normalizeStr(d.name || '');
        return searchWords.every(word => docName.includes(word));
      });
    }
    return filtered;
  }, [myFullDocsList, searchTerm, filterCity, filterSpecialty, filterCategory, selectedDoctor]);

  const days = Array.from({length: daysInMonth}, (_, i) => i + 1)

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">Planeación</h1>
          <p className="text-gray-500 font-medium capitalize mt-2">{monthName} {currentYear}</p>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="bg-white p-2 rounded-2xl shadow-sm border flex items-center gap-3 w-full sm:w-auto">
              <Filter size={20} className="text-indigo-600 ml-2"/>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold bg-transparent outline-none">
                <option value="Todos">Toda la Empresa</option>
                {repsList.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <button onClick={exportCSV} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-100">
              <Download size={16}/> Descargar Excel
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-10">
        {(!isAdmin || (isAdmin && selectedRep !== 'Todos')) && (
          <div className="w-full space-y-6">
            {!editingId && (
              <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-gray-100">
                <select className="w-full bg-gray-50 border rounded-2xl py-4 px-5 text-sm font-bold" value={selectedDoctor?.id || ""} onChange={(e) => {
                  const docFound = myFullDocsList.find((d:any) => d.id === e.target.value)
                  if (docFound) { setSelectedDoctor(docFound); }
                }}>
                  <option value="">-- Seleccionar Médico desde Lista Completa --</option>
                  {myFullDocsList.map((docItem:any) => <option key={docItem.id} value={docItem.id}>{docItem.name} — {docItem.city}</option>)}
                </select>
                <div className="my-6 border-b border-gray-100"></div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Filtrar Base Médica</h3>
                <div className="relative mb-3">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Escribe un nombre o apellido..." className="w-full bg-white border-2 border-gray-100 shadow-sm rounded-2xl py-3 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 w-4 h-4 pointer-events-none" />
                    <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="w-full bg-blue-50 text-blue-900 border-none rounded-xl py-3 pl-9 pr-8 text-xs font-bold appearance-none cursor-pointer outline-none">
                      <option value="">Todas las Ciudades</option>
                      {citiesList.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 w-4 h-4 pointer-events-none" />
                    <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)} className="w-full bg-orange-50 text-orange-900 border-none rounded-xl py-3 pl-9 pr-8 text-xs font-bold appearance-none cursor-pointer outline-none">
                      <option value="">Todas las Especialidades</option>
                      {specialtiesList.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 w-4 h-4 pointer-events-none" />
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-purple-50 text-purple-900 border-none rounded-xl py-3 pl-9 pr-8 text-xs font-bold appearance-none cursor-pointer outline-none">
                      <option value="">Todas las Categorías</option>
                      {categoriesList.map(c => <option key={c as string} value={c as string}>Categoría {c as string}</option>)}
                    </select>
                  </div>
                </div>

                {myDocsFiltered.length > 0 && !selectedDoctor && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {myDocsFiltered.map((docItem:any) => (
                      <button key={docItem.id} onClick={() => { setSelectedDoctor(docItem); clearFilters() }} className="w-full text-left p-4 bg-white border shadow-sm hover:border-blue-500 rounded-2xl font-bold uppercase text-xs transition-all group">
                        <div className="flex justify-between items-center">
                          <span className="group-hover:text-blue-600 transition-colors">{docItem.name}</span>
                          {docItem.category && <span className="bg-purple-100 text-purple-700 text-[9px] px-2 py-0.5 rounded-md">CAT: {docItem.category}</span>}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 mt-1.5 flex gap-3">
                          <span className="flex items-center gap-1"><MapPin size={10}/> {docItem.city}</span>
                          <span className="flex items-center gap-1"><Star size={10}/> {docItem.specialty}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedDoctor && (
              <div className={`p-8 rounded-[40px] shadow-xl border-2 transition-all ${editingId ? 'bg-orange-50 border-orange-400' : 'bg-white border-blue-600 animate-in zoom-in-95'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0 ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}><User size={24} /></div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-tight mb-1">{selectedDoctor.name}</h2>
                      <div className="flex flex-wrap items-center gap-x-2 text-[10px] font-bold text-gray-400 uppercase">
                        {selectedDoctor.category && <span className="text-blue-500">CAT: {selectedDoctor.category}</span>}
                        <span className="opacity-20">|</span>
                        <span>{selectedDoctor.specialty}</span>
                        <span className="opacity-20">|</span>
                        <span>{selectedDoctor.city}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={resetForm} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={16}/></button>
                </div>

                {/* --- SEGUIMIENTO ANTERIOR (DISEÑO FLAT) --- */}
                {lastComment && (
                  <div className="mb-6 pt-4 border-t border-gray-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <MessageSquare size={12} /> Último Seguimiento:
                    </p>
                    <p className="text-xs text-gray-500 font-medium italic leading-relaxed">
                      "{lastComment}"
                    </p>
                  </div>
                )}

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
                <button disabled={saving} onClick={handleSaveVisit} className={`w-full text-white text-[10px] font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${editingId ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : editingId ? 'Actualizar Cita' : 'Agendar Cita'}
                </button>
                {editingId && (
                  <button onClick={handleDeleteVisit} className="w-full mt-3 text-red-600 bg-red-50 py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-red-100 transition-colors">Eliminar Cita</button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-3">
            {days.map(d => {
              const currentDStr = `${currentYear}-${currentMonthStr}-${d.toString().padStart(2, '0')}`
              const visitsOnDay = plannedVisits.filter(v => v.visitDate === currentDStr)
              return (
                <div key={d} className={`bg-white p-3 lg:p-4 rounded-[30px] border transition-all min-h-[120px] lg:min-h-[150px] flex flex-col relative ${visitsOnDay.length > 0 ? 'border-blue-500 ring-2 ring-blue-50 bg-blue-50/20' : 'border-gray-100 shadow-sm'}`}>
                  <span className={`text-[11px] font-black mb-2 ${visitsOnDay.length > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{d.toString().padStart(2, '0')} / {currentMonthStr}</span>
                  <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1 flex-1">
                    {visitsOnDay.map((v: any) => (
                      <button key={v.id} onClick={() => startEdit(v)} className="w-full text-left p-2 rounded-xl bg-white border border-blue-100 shadow-sm hover:shadow-md transition-all group">
                        <p className="text-[9px] font-black text-gray-900 uppercase leading-tight line-clamp-2 group-hover:text-blue-600">{v.doctorName}</p>
                        <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase italic">{v.doctorDetails?.city || '---'}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase ${v.status === 'Realizada' ? 'bg-green-100 text-green-700' : v.status === 'Reagendada' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{v.status}</span>
                        </div>
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