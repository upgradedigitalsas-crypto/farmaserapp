'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore'
// SÓLO AÑADÍ "Download" AQUÍ ABAJO PARA EL ICONO DEL BOTÓN
import { Search, User, Filter, MapPin, Star, Tag, Loader2, X, Pencil, Phone, Download } from 'lucide-react'

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
  return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

export default function PlanningPage() {
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  const [doctors, setDoctors] = useState<any[]>([])
  const [plannedVisits, setPlannedVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  
  // NUEVOS ESTADOS PARA LOS FILTROS E-COMMERCE (INTACTOS)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

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

      if (locationFingerprint) {
        visitData.locationFingerprint = locationFingerprint;
      }

      if (editingId) {
        await updateDoc(doc(db, 'planned_visits', editingId), visitData)
      } else {
        await addDoc(collection(db, 'planned_visits'), { ...visitData, createdAt: Timestamp.now() })
      }
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
    const freshDoctor = doctors.find(d => d.id === v.doctorId);
    if (freshDoctor) {
      setSelectedDoctor({ ...freshDoctor, name: v.doctorName }) 
    } else {
      setSelectedDoctor({ id: v.doctorId, name: v.doctorName, ...v.doctorDetails }) 
    }
    setVisitDate(v.visitDate); setStartTime(v.startTime || ''); setEndTime(v.endTime || ''); setStatus(v.status)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null); setSelectedDoctor(null); setVisitDate('2026-04-01'); setStartTime(''); setEndTime('')
  }

  const clearFilters = () => {
    setSearchTerm(''); setFilterCity(''); setFilterSpecialty(''); setFilterCategory('');
  }

  // === ESTA ES LA ÚNICA FUNCIÓN NUEVA: EXPORTAR A EXCEL ===
  const exportCSV = () => {
    if (plannedVisits.length === 0) return alert('No hay citas agendadas para exportar.');
    
    let csv = "Fecha,Visitador,Medico,Especialidad,Ciudad,Estado,Hora Inicio,Hora Fin\n";
    plannedVisits.forEach(v => {
      csv += `${v.visitDate || ''},${v.userEmail || ''},"${v.doctorName || ''}","${v.doctorDetails?.specialty || ''}","${v.doctorDetails?.city || ''}",${v.status || ''},${v.startTime || '--:--'},${v.endTime || '--:--'}\n`;
    });
    
    const csvContent = "\uFEFF" + csv; // Garantiza tildes y eñes
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Planeacion_${selectedRep}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  // =========================================================

  const myFullDocsList = useMemo(() => {
    const email = isAdmin ? (selectedRep === 'Todos' ? '' : selectedRep) : user?.email?.toLowerCase().trim()
    if (!email && isAdmin) return []
    const planned = new Set(plannedVisits.map(v => String(v.doctorName || '').toLowerCase().trim()))
    return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === email && !planned.has(String(d.name || '').toLowerCase().trim())).sort((a: any, b: any) => a.name.localeCompare(b.name))
  }, [doctors, user, selectedRep, isAdmin, plannedVisits])

  // LISTAS DINÁMICAS PARA LOS SELECTORES (INTACTAS)
  const citiesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.city).filter(Boolean))).sort(), [myFullDocsList])
  const specialtiesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.specialty).filter(Boolean))).sort(), [myFullDocsList])
  const categoriesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.category).filter(Boolean))).sort(), [myFullDocsList])

  // MOTOR DE FILTRADO TIPO E-COMMERCE (INTACTO)
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

  const days = Array.from({length: 30}, (_, i) => i + 1)

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic">Planeación</h1>
          <p className="text-gray-500 font-medium">Abril 2026</p>
        </div>
        
        {/* === AQUÍ SE AÑADIÓ EL BOTÓN AL LADO DEL FILTRO === */}
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
        {/* ================================================== */}
        
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
                  <input 
                    type="text" 
                    placeholder="Escribe un nombre o apellido..." 
                    className="w-full bg-white border-2 border-gray-100 shadow-sm rounded-2xl py-3 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
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

                {(searchTerm || filterCity || filterSpecialty || filterCategory) && (
                  <div className="mt-4 flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Mostrando {myDocsFiltered.length} resultados
                    </span>
                    <button onClick={clearFilters} className="text-[10px] font-black text-red-500 uppercase hover:text-red-700 transition-colors">
                      Limpiar Filtros ✖
                    </button>
                  </div>
                )}
                
                {(searchTerm || filterCity || filterSpecialty || filterCategory) && !selectedDoctor && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {myDocsFiltered.length === 0 ? (
                       <div className="text-center p-6 border-2 border-dashed rounded-2xl">
                         <p className="text-xs font-bold text-gray-400 uppercase">Ningún médico coincide con estos filtros.</p>
                       </div>
                    ) : (
                      myDocsFiltered.map((docItem:any) => (
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
                      ))
                    )}
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
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-gray-400 uppercase mt-1">
                        {selectedDoctor.category && <span className="text-blue-500">CAT: {selectedDoctor.category}</span>}
                        <span className="opacity-20">|</span>
                        <span>{selectedDoctor.specialty}</span>
                        <span className="opacity-20">|</span>
                        <span>{selectedDoctor.city}</span>
                        {selectedDoctor.address && selectedDoctor.address !== 'Principal' && (
                          <>
                            <span className="opacity-20">|</span>
                            <span>DIR: {selectedDoctor.address}</span>
                          </>
                        )}
                        {selectedDoctor.phone && (
                          <>
                            <span className="opacity-20">|</span>
                            <span className="flex items-center gap-1 text-green-600 font-black">
                              <Phone size={10} fill="currentColor" /> {selectedDoctor.phone}
                            </span>
                          </>
                        )}
                      </div>
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
                  <button onClick={handleDeleteVisit} className="w-full mt-3 text-red-600 bg-red-50 py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-red-100 transition-colors">Eliminar Cita</button>
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