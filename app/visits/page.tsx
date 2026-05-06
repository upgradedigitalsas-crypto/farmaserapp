'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore, TEAM_MAPPING } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Search, User, Filter, MapPin, Star, Tag, Loader2, X, Pencil, Phone, Download, MessageSquare } from 'lucide-react'

// === LÓGICA AUTOMÁTICA DE FECHAS (MES A MES) ===
const now = new Date();
const currentMonthStr = (now.getMonth() + 1).toString().padStart(2, '0');
const currentYear = now.getFullYear();
const monthName = now.toLocaleString('es-ES', { month: 'long' });
const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
const filterKey = `${currentYear}-${currentMonthStr}`; // Ej: "2026-05"

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

const normalizeStr = (str: any) => {
  if (!str) return '';
  return String(str)
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
  const [lastComment, setLastComment] = useState<string | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const [visitDate, setVisitDate] = useState(now.toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [status, setStatus] = useState('Planeada')
  const [editingId, setEditingId] = useState<string | null>(null)

  const userEmail = user?.email?.toLowerCase().trim() || ''
  const isAdmin = user?.role === 'admin' || userEmail === 'entrenamientofarmaser@gmail.com'
  const isManager = user?.role === 'manager' || Object.keys(TEAM_MAPPING).includes(userEmail)

  const fetchData = async () => {
    setLoading(true)
    try {
      const resDocs = await fetch('/api/doctors')
      const dataDocs = await resDocs.json()
      setDoctors(Array.isArray(dataDocs) ? dataDocs : [])
      
      const vRef = collection(db, 'planned_visits')
      
      let q;
      if (isAdmin && selectedRep === 'Todos') {
         q = query(vRef);
      } else if (isManager && selectedRep === 'Todos') {
         q = query(vRef); 
      } else {
         const emailTarget = (isAdmin || isManager) && selectedRep !== 'Todos' ? selectedRep : userEmail;
         q = query(vRef, where('userEmail', '==', emailTarget));
      }

      const snap = await getDocs(q)
      let all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      
      if (isManager && selectedRep === 'Todos') {
        const myTeam = TEAM_MAPPING[userEmail] || [];
        all = all.filter((v: any) => myTeam.includes(String(v.userEmail || '').toLowerCase().trim()));
      }

      // ESTO GARANTIZA QUE 'plannedVisits' SOLO TENGA CITAS DEL MES VIGENTE
      setPlannedVisits(all.filter((v: any) => v.visitDate?.includes(filterKey)))
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [user, selectedRep])

  useEffect(() => {
    if (!selectedDoctor) {
      setLastComment(null);
      return;
    }

    const fetchLastComment = async () => {
      try {
        const emailToSearch = (isAdmin || isManager) && selectedRep !== 'Todos' ? selectedRep : userEmail;
        const q = query(collection(db, 'visit_reports'), where('userEmail', '==', emailToSearch));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const doctorReports = snap.docs
            .map(d => d.data())
            .filter(r => normalizeStr(r.doctorName) === normalizeStr(selectedDoctor.name))
            .sort((a: any, b: any) => {
              const dateA = a.reportedAt?.toDate ? a.reportedAt.toDate() : new Date(a.reportedAt);
              const dateB = b.reportedAt?.toDate ? b.reportedAt.toDate() : new Date(b.reportedAt);
              return dateB - dateA;
            });

          if (doctorReports.length > 0) {
            setLastComment(doctorReports[0].observations);
          } else {
            setLastComment(null);
          }
        }
      } catch (e) {
        console.error("Error buscando último seguimiento:", e);
        setLastComment(null);
      }
    };
    fetchLastComment();
  }, [selectedDoctor, user, selectedRep, isAdmin, isManager, userEmail]);

  const repsList = useMemo(() => {
    if (isAdmin) {
      return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#')))).sort()
    } else if (isManager) {
      const myTeam = TEAM_MAPPING[userEmail] || []
      return myTeam.filter(email => email !== userEmail).sort()
    }
    return []
  }, [doctors, isAdmin, isManager, userEmail])

  const myFullDocsList = useMemo(() => {
    if (isAdmin && selectedRep === 'Todos') return doctors.sort((a: any, b: any) => a.name.localeCompare(b.name));
    if (isManager && selectedRep === 'Todos') {
      const myTeam = TEAM_MAPPING[userEmail] || [];
      return doctors.filter((d: any) => myTeam.includes(String(d.assignedTo || '').toLowerCase().trim())).sort((a: any, b: any) => a.name.localeCompare(b.name));
    }
    const emailToFilter = (isAdmin || isManager) && selectedRep !== 'Todos' ? selectedRep : userEmail;
    return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === emailToFilter).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [doctors, isAdmin, isManager, userEmail, selectedRep])

  // 🔥 LÓGICA DE EXCLUSIÓN BLINDADA CONTRA "SIN CODIGO" Y MESES ANTERIORES
  const availableDocs = useMemo(() => {
    return myFullDocsList.filter(doc => {
      // 1. Si estamos editando, permitimos que el médico seleccionado se vea
      if (editingId) {
        const currentEdit = plannedVisits.find(v => v.id === editingId);
        if (currentEdit && (currentEdit.doctorId === doc.id || normalizeStr(currentEdit.doctorName) === normalizeStr(doc.name))) {
          return true;
        }
      }
      
      // 2. Revisamos si YA ESTÁ en la lista del mes vigente
      const tieneCitaEsteMes = plannedVisits.some(v => {
        const isDocIdReal = doc.id && !String(doc.id).includes('SIN CODIGO');
        const isVisitIdReal = v.doctorId && !String(v.doctorId).includes('SIN CODIGO');

        // A. Si ambos tienen código real, el código manda
        if (isDocIdReal && isVisitIdReal) {
          if (String(doc.id).trim() === String(v.doctorId).trim()) return true;
        }
        
        // B. Si alguno no tiene código, cruzamos por Nombre Y Ciudad exactos
        const docName = normalizeStr(doc.name);
        const visitName = normalizeStr(v.doctorName);
        const docCity = normalizeStr(doc.city);
        const visitCity = normalizeStr(v.doctorDetails?.city);

        if (docName === visitName && docCity === visitCity) {
          return true;
        }
        
        return false;
      });
      
      // 3. Lo ocultamos SOLO si tiene cita en el mes.
      return !tieneCitaEsteMes;
    });
  }, [myFullDocsList, plannedVisits, editingId]);

  const citiesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.city).filter(Boolean))).sort(), [myFullDocsList])
  const specialtiesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.specialty).filter(Boolean))).sort(), [myFullDocsList])
  const categoriesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.category).filter(Boolean))).sort(), [myFullDocsList])

  const myDocsFiltered = useMemo(() => {
    if (selectedDoctor) return [];
    if (!searchTerm.trim() && !filterCity && !filterSpecialty && !filterCategory) return [];
    
    let filtered = availableDocs; 
    
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
  }, [availableDocs, searchTerm, filterCity, filterSpecialty, filterCategory, selectedDoctor]);

  const handleSaveVisit = async () => {
    if (!selectedDoctor || !visitDate) return alert('Datos incompletos')
    setSaving(true)
    try {
      const locationFingerprint = await getFingerprintLocation()
      const targetEmail = (isAdmin || isManager) && selectedRep !== 'Todos' ? selectedRep : userEmail
      
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
    link.click();
  }

  const days = Array.from({length: daysInMonth}, (_, i) => i + 1)

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">Planeación</h1>
          <p className="text-gray-500 font-medium capitalize mt-2">{monthName} {currentYear}</p>
        </div>
        
        {(isAdmin || isManager) && (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="bg-white p-2 rounded-2xl shadow-sm border flex items-center gap-3 w-full sm:w-auto">
              <Filter size={20} className="text-indigo-600 ml-2"/>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold bg-transparent outline-none cursor-pointer pr-4">
                {isAdmin ? (
                  <option value="Todos">Toda la Empresa</option>
                ) : (
                  <>
                    <option value="Todos">Consolidado Equipo</option>
                    <option value={userEmail}>Mi Gestión Propia</option>
                  </>
                )}
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
        {((!isAdmin && !isManager) || selectedRep !== 'Todos') && (
          <div className="w-full space-y-6">
            {!editingId && (
              <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-gray-100">
                {/* 🔥 AGREGADO EL ESTADO 'LOADING' PARA EVITAR EL PARPADEO */}
                <select 
                  className="w-full bg-gray-50 border rounded-2xl py-4 px-5 text-sm font-bold" 
                  disabled={loading} 
                  value={selectedDoctor?.id || ""} 
                  onChange={(e) => {
                    const docFound = availableDocs.find((d:any) => d.id === e.target.value)
                    if (docFound) { setSelectedDoctor(docFound); }
                  }}
                >
                  {loading ? (
                    <option value="">Cargando información de Firebase...</option>
                  ) : availableDocs.length === 0 ? (
                    <option value="">-- Todos los médicos ya están agendados este mes --</option>
                  ) : (
                    <>
                      <option value="">-- Médicos Pendientes por Planear --</option>
                      {availableDocs.map((docItem:any) => (
                        <option key={docItem.id} value={docItem.id}>
                          {docItem.name} — {docItem.city}
                        </option>
                      ))}
                    </>
                  )}
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
                      <button 
                        key={v.id} 
                        onClick={() => {
                          if (isAdmin || userEmail === v.userEmail) {
                            startEdit(v)
                          } else {
                            alert(`Esta cita pertenece a ${v.userEmail}. No puedes editarla.`);
                          }
                        }} 
                        className="w-full text-left p-2.5 rounded-xl bg-blue-600 shadow-md hover:bg-blue-700 transition-all group mb-1.5 border border-blue-500"
                      >
                        <p className="text-[10px] font-black text-white uppercase leading-tight line-clamp-2">
                          {v.doctorName}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-[8px] font-bold text-blue-100 uppercase italic truncate max-w-[70%]">
                            {v.doctorDetails?.city || '---'}
                          </p>
                          <span className="text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase bg-white/20 text-white border border-white/10">
                            {v.status}
                          </span>
                        </div>
                        {(isAdmin || isManager) && selectedRep === 'Todos' && (
                          <p className="text-[7px] font-black text-blue-200 mt-1 pt-1 border-t border-white/10 truncate">
                            {v.userEmail.split('@')[0]}
                          </p>
                        )}
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