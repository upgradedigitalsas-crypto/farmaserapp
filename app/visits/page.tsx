'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore, TEAM_MAPPING } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Search, User, Filter, MapPin, Star, Tag, Loader2, X, Pencil, Phone, Download, MessageSquare, Navigation, Mail, Clock } from 'lucide-react'
import { downloadCSV } from '@/lib/downloadCSV'

// === LÓGICA AUTOMÁTICA DE FECHAS (MES A MES) ===
const now = new Date();
const currentMonthStr = (now.getMonth() + 1).toString().padStart(2, '0');
const currentYear = now.getFullYear();
const monthName = now.toLocaleString('es-ES', { month: 'long' });
const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
const firstDayOfMonth = new Date(currentYear, now.getMonth(), 1).getDay(); // 0=Dom
const currentDay = now.getDate();
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

const normalizeStr = (str: any) => {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ' ') 
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
  const [viewOnly, setViewOnly] = useState(false)

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

      setPlannedVisits(all.filter((v: any) => v.visitDate?.includes(filterKey)))
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [user, selectedRep])

  useEffect(() => {
    if (!selectedDoctor) { setLastComment(null); return; }
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
          if (doctorReports.length > 0) setLastComment(doctorReports[0].observations);
          else setLastComment(null);
        }
      } catch (e) { setLastComment(null); }
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

  const availableDocs = useMemo(() => {
    const planned = new Set(
      plannedVisits
        .filter(v => v.id !== editingId)
        .map(v => normalizeStr(v.doctorName))
    );
    return myFullDocsList.filter(doc => !planned.has(normalizeStr(doc.name)));
  }, [myFullDocsList, plannedVisits, editingId]);

  const citiesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.city).filter(Boolean))).sort(), [myFullDocsList])
  const specialtiesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.specialty).filter(Boolean))).sort(), [myFullDocsList])
  const categoriesList = useMemo(() => Array.from(new Set(myFullDocsList.map(d => d.category).filter(Boolean))).sort(), [myFullDocsList])

  // Mapa nombre→ciudad desde Google Sheets (fuente de verdad) para mostrar ciudad correcta
  // aunque en Firestore esté guardada una ciudad incorrecta por el bug anterior
  const doctorCityMap = useMemo(() => {
    const map = new Map<string, string>();
    doctors.forEach(d => { if (d.name) map.set(normalizeStr(d.name), d.city || '') });
    return map;
  }, [doctors])

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
        status: 'Planeada', // Siempre Planeada desde este módulo; el estado lo cambia Reportes
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

  const startEdit = (v: any, readOnly = false) => {
    // Si la cita ya fue reportada (no está Planeada) → siempre modo solo lectura
    const forceReadOnly = readOnly || v.status !== 'Planeada'
    setViewOnly(forceReadOnly)
    setEditingId(forceReadOnly ? null : v.id)
    const vName = normalizeStr(v.doctorName);
    const vCity = normalizeStr(v.doctorDetails?.city || v.city || '');
    // Intento 1: nombre + ciudad (ambos coinciden)
    let freshDoctor = doctors.find(d => {
      const dName = normalizeStr(d.name);
      const dCity = normalizeStr(d.city);
      return dName === vName && (vCity === '' || dCity === vCity);
    });
    // Intento 2: solo nombre (la ciudad guardada puede estar incorrecta por el bug anterior)
    if (!freshDoctor) {
      freshDoctor = myFullDocsList.find(d => normalizeStr(d.name) === vName);
    }
    if (freshDoctor) setSelectedDoctor({ ...freshDoctor, name: v.doctorName });
    else setSelectedDoctor({ id: v.doctorId, name: v.doctorName, ...v.doctorDetails });
    setVisitDate(v.visitDate); setStartTime(v.startTime || ''); setEndTime(v.endTime || ''); setStatus(v.status)
    // En móvil el scroll vive en main > div (overflow-y-auto), no en window
    const scrollContainer = document.querySelector('main > div') as HTMLElement
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const resetForm = () => {
    setEditingId(null); setSelectedDoctor(null); setViewOnly(false); setVisitDate(now.toISOString().split('T')[0]); setStartTime(''); setEndTime('')
  }

  const clearFilters = () => {
    setSearchTerm(''); setFilterCity(''); setFilterSpecialty(''); setFilterCategory('');
  }

  const exportCSV = async () => {
    if (plannedVisits.length === 0) return alert('No hay citas agendadas para exportar.');
    let csv = "Fecha,Visitador,Medico,Especialidad,Ciudad,Direccion,Telefono,Estado,Hora Inicio,Hora Fin\n";
    plannedVisits.forEach(v => {
      const liveCity = doctorCityMap.get(normalizeStr(v.doctorName)) || v.doctorDetails?.city || ''
      csv += `${v.visitDate || ''},${v.userEmail || ''},"${v.doctorName || ''}","${v.doctorDetails?.specialty || ''}","${liveCity}","${v.doctorDetails?.address || ''}","${v.doctorDetails?.phone || ''}",${v.status || ''},${v.startTime || '--:--'},${v.endTime || '--:--'}\n`;
    });
    await downloadCSV(csv, `Planeacion_${monthName}_${currentYear}.csv`)
  }

  const days = Array.from({length: daysInMonth}, (_, i) => i + 1)
  
  const selectedIndex = selectedDoctor ? availableDocs.indexOf(selectedDoctor) : -1;

  return (
    <div className="p-4 pt-20 lg:p-10 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F5F5F7]">
      <header className="flex flex-col md:flex-row justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Planeación de Visitas</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{monthName} {currentYear}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {(isAdmin || isManager) && (
            <div className="bg-white px-3 py-2.5 rounded-2xl shadow-sm border border-black/[0.06] flex items-center gap-2.5 w-full sm:w-auto">
              <Filter size={15} className="text-indigo-500 ml-1 shrink-0"/>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-semibold text-gray-800 bg-transparent outline-none cursor-pointer pr-4">
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
          )}
          <button onClick={exportCSV} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98]">
            <Download size={14}/> Descargar Excel
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-10">
        {((!isAdmin && !isManager) || selectedRep !== 'Todos') && (
          <div className="w-full space-y-6">
            {!editingId && (
              <div className="bg-white p-5 md:p-7 rounded-2xl shadow-sm border border-black/[0.06]">
                <select
                  className="w-full bg-gray-50 border-0 rounded-xl py-3.5 px-4 text-sm font-medium text-gray-800 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                  disabled={loading} 
                  value={selectedIndex >= 0 ? selectedIndex : ""} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "") setSelectedDoctor(availableDocs[Number(val)]);
                    else setSelectedDoctor(null);
                  }}
                >
                  {loading ? (
                    <option value="">Cargando información de Firebase...</option>
                  ) : availableDocs.length === 0 ? (
                    <option value="">-- Todos los médicos ya están agendados este mes --</option>
                  ) : (
                    <>
                      <option value="">-- Médicos Pendientes por Planear --</option>
                      {availableDocs.map((docItem:any, idx: number) => (
                        <option key={`opt-${idx}`} value={idx}>
                          {docItem.name} — {docItem.city}
                        </option>
                      ))}
                    </>
                  )}
                </select>

                <div className="my-5 border-b border-gray-100"></div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Filtrar Base Médica</h3>

                <div className="relative mb-3">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" placeholder="Escribe un nombre o apellido..." className="w-full bg-gray-50 border-0 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                    {myDocsFiltered.map((docItem:any, idx: number) => (
                      <button key={`btn-${idx}`} onClick={() => { setSelectedDoctor(docItem); clearFilters() }} className="w-full text-left p-4 bg-white border shadow-sm hover:border-blue-500 rounded-2xl font-bold uppercase text-xs transition-all group">
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
              <div className={`p-6 rounded-2xl shadow-md border transition-all ${viewOnly ? 'bg-slate-50 border-slate-200' : editingId ? 'bg-orange-50 border-orange-300' : 'bg-white border-blue-200 animate-in zoom-in-95'}`}>
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
                      <div className="flex flex-col gap-0.5 mt-1.5">
                        {selectedDoctor.address && (
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                            <Navigation size={10} className="text-gray-400 shrink-0" />
                            <span>{selectedDoctor.address}</span>
                          </div>
                        )}
                        {selectedDoctor.email && (
                          <div className="flex items-center gap-1.5 text-[10px] text-blue-500">
                            <Mail size={10} className="shrink-0" />
                            <span>{selectedDoctor.email}</span>
                          </div>
                        )}
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

                {/* Badge de estado — solo lectura cuando no es Planeada */}
                {viewOnly && (
                  <div className={`mb-4 flex items-center gap-2 rounded-xl px-3 py-2 ${
                    status === 'Realizada' ? 'bg-emerald-50 border border-emerald-200' :
                    status === 'Reagendada' ? 'bg-orange-50 border border-orange-200' :
                    'bg-slate-100'
                  }`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      status === 'Realizada' ? 'text-emerald-600' :
                      status === 'Reagendada' ? 'text-orange-500' :
                      'text-slate-500'
                    }`}>
                      {status === 'Realizada' ? '✅ Realizada — reportada en el módulo de Reportes' :
                       status === 'Reagendada' ? '🔄 Reagendada — reportada en el módulo de Reportes' :
                       '👁 Solo lectura'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input type="date" value={visitDate} disabled={viewOnly} onChange={e => setVisitDate(e.target.value)} className="w-full bg-gray-50 border-0 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed" />
                  {/* Estado solo visible en modo lectura — no se puede cambiar desde Planeación */}
                  {viewOnly ? (
                    <div className={`w-full rounded-xl py-3 px-4 text-sm font-semibold ${
                      status === 'Realizada' ? 'bg-emerald-100 text-emerald-700' :
                      status === 'Reagendada' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>{status}</div>
                  ) : (
                    <div className="w-full bg-blue-50 border border-blue-100 rounded-xl py-3 px-4 text-sm font-semibold text-blue-600">
                      Planeada
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <input type="time" value={startTime} disabled={viewOnly} onChange={e => setStartTime(e.target.value)} className="w-full bg-gray-50 border-0 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed" />
                  <input type="time" value={endTime} disabled={viewOnly} onChange={e => setEndTime(e.target.value)} className="w-full bg-gray-50 border-0 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed" />
                </div>
                {!viewOnly && (
                  <>
                    <button disabled={saving} onClick={handleSaveVisit} className={`w-full text-white text-sm font-semibold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 ${editingId ? 'bg-orange-500 shadow-orange-600/20' : 'bg-blue-600 shadow-blue-600/20'}`}>
                      {saving ? <Loader2 className="animate-spin" size={16} /> : editingId ? 'Actualizar Cita' : 'Agendar Cita'}
                    </button>
                    {editingId && (
                      <button onClick={handleDeleteVisit} className="w-full mt-2.5 text-red-500 bg-red-50 py-2.5 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors">Eliminar Cita</button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CALENDARIO ESTILO APPLE ─────────────────────────────────── */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden">

          {/* Cabecera días de la semana */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/60">
            {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Celdas del mes */}
          <div className="grid grid-cols-7">

            {/* Celdas vacías antes del día 1 */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`pre-${i}`} className="min-h-[100px] md:min-h-[140px] border-b border-r border-gray-100 bg-gray-50/40 last:border-r-0" />
            ))}

            {/* Días del mes */}
            {days.map(d => {
              const currentDStr = `${currentYear}-${currentMonthStr}-${d.toString().padStart(2,'0')}`
              const visitsOnDay = plannedVisits
                .filter(v => v.visitDate === currentDStr)
                .sort((a,b) => (a.startTime||'00:00').localeCompare(b.startTime||'00:00'))
              const isToday = d === currentDay
              const col = (firstDayOfMonth + d - 1) % 7
              const isLastCol = col === 6
              return (
                <div key={d}
                  className={`min-h-[100px] md:min-h-[140px] border-b border-r border-gray-100 p-1 md:p-1.5 flex flex-col
                    ${isLastCol ? 'border-r-0' : ''}
                    ${visitsOnDay.length > 0 ? 'bg-blue-50/20' : ''}`}>

                  {/* Número del día */}
                  <div className="flex justify-center mb-1">
                    <span className={`text-[11px] md:text-xs font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full transition-colors
                      ${isToday ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                      {d}
                    </span>
                  </div>

                  {/* Citas — sin límite, la celda crece con el contenido */}
                  <div className="space-y-0.5">
                    {visitsOnDay.map((v: any, idx: number) => {
                      const isRealizada = v.status === 'Realizada'
                      const isReagendada = v.status === 'Reagendada'
                      const bgColor = isRealizada
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : isReagendada
                        ? 'bg-orange-400 hover:bg-orange-500'
                        : 'bg-blue-600 hover:bg-blue-700'
                      // Ciudad: fuente primaria = Sheet actual, fallback = dato guardado en Firestore
                      const city = doctorCityMap.get(normalizeStr(v.doctorName)) || v.doctorDetails?.city || ''

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            // Planeadas: editable para el dueño/admin; solo-lectura para manager
                            // Realizadas/Reagendadas: siempre solo-lectura (startEdit lo fuerza internamente)
                            if (isAdmin || userEmail === v.userEmail) startEdit(v, false)
                            else if (isManager) startEdit(v, true)
                          }}
                          className={`w-full text-left rounded-md px-1.5 md:px-1.5 py-1.5 md:py-1.5 ${bgColor} transition-colors`}
                        >
                          {/* Desktop: hora + nombre + ciudad + tag */}
                          <div className="hidden md:block">
                            {v.startTime && (
                              <p className="text-[8px] font-black text-white/80 leading-none mb-0.5 flex items-center gap-0.5">
                                <Clock size={7} className="inline shrink-0" /> {v.startTime}
                              </p>
                            )}
                            <p className="text-[9px] font-bold text-white truncate leading-tight">{v.doctorName}</p>
                            {city && <p className="text-[8px] text-white/70 truncate leading-none mt-0.5">{city}</p>}
                            <span className="inline-block mt-0.5 text-[7px] font-black px-1 py-px rounded leading-none bg-white/20 text-white">
                              {v.status}
                            </span>
                          </div>
                          {/* Mobile: hora + nombre completo en 2 líneas + ciudad */}
                          <div className="md:hidden space-y-px">
                            {v.startTime && (
                              <p className="text-[8px] font-black text-white/90 leading-none">{v.startTime}</p>
                            )}
                            <p className="text-[8px] font-bold text-white leading-[1.2] break-words hyphens-auto">{v.doctorName}</p>
                            {city && (
                              <p className="text-[7px] text-white/75 leading-none font-semibold">{city}</p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Celdas vacías al final para completar la última fila */}
            {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_,i) => (
              <div key={`post-${i}`} className="min-h-[100px] md:min-h-[140px] border-b border-r border-gray-100 bg-gray-50/40 last:border-r-0" />
            ))}

          </div>
        </div>
      </div>
    </div>
  )
}