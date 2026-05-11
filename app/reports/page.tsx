'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore, TEAM_MAPPING } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp, orderBy } from 'firebase/firestore'
import { User, MapPin, Plus, Minus, CheckCircle, Loader2, X, MessageSquare, Package, AlertCircle, Filter, Download, Briefcase, History } from 'lucide-react'
import { downloadCSV } from '@/lib/downloadCSV'

// 🛡️ CAPTURA DE GPS SILENCIOSA
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

export default function ReportsPage() {
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [doctors, setDoctors] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [auditReports, setAuditReports] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [repHistory, setRepHistory] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'pendientes' | 'historial'>('pendientes')

  const [selectedVisit, setSelectedVisit] = useState<any>(null)
  const [obs, setObs] = useState('')
  const [status, setStatus] = useState('Realizada')
  const [samples, setSamples] = useState<any[]>([]) 
  
  // Fecha en hora Colombia (UTC-5) — toISOString() daría UTC y después de las 7pm
  // mostraría el día siguiente, causando que se reporten citas del día equivocado.
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

  // === FASE 3.0: Variables de Jerarquía y Blindaje Caché ===
  const userEmail = user?.email?.toLowerCase().trim() || ''
  const isAdmin = user?.role === 'admin' || userEmail === 'entrenamientofarmaser@gmail.com'
  const isManager = user?.role === 'manager' || Object.keys(TEAM_MAPPING).includes(userEmail)

  useEffect(() => {
    fetch('/api/doctors').then(res => res.json()).then(data => setDoctors(Array.isArray(data) ? data : []))
    fetch('/api/products').then(res => res.json()).then(data => setProducts(Array.isArray(data) ? data : []))
  }, [])

  // Lista para el Dropdown (Solo Admin y Manager)
  const repsList = useMemo(() => {
    if (isAdmin) {
      return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#')))).sort()
    } else if (isManager) {
      const myTeam = TEAM_MAPPING[userEmail] || []
      return myTeam.filter(email => email !== userEmail).sort()
    }
    return []
  }, [doctors, isAdmin, isManager, userEmail])

  // ==========================================
  // CARGA DE DATOS PARA MODO: "AUDITORÍA" 
  // ==========================================
  useEffect(() => {
    if (!isAdmin && !isManager) return; 
    if (isManager && selectedRep === userEmail) return;

    const fetchAudit = async () => {
      setLoadingAudit(true)
      try {
        const q = query(collection(db, 'visit_reports'), orderBy('reportedAt', 'desc'));
        const snap = await getDocs(q);
        let allData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (isAdmin && selectedRep === 'Todos') {
          setAuditReports(allData);
        } else if (isManager && selectedRep === 'Todos') {
          const myTeam = TEAM_MAPPING[userEmail] || [];
          const filtered = allData.filter((r: any) => myTeam.includes(String(r.userEmail || '').toLowerCase().trim()));
          setAuditReports(filtered);
        } else {
          const filtered = allData.filter((r: any) => 
            String(r.userEmail || '').toLowerCase().trim() === selectedRep.toLowerCase().trim()
          );
          setAuditReports(filtered);
        }
      } catch (e) { console.error("Error auditoría:", e) } finally { setLoadingAudit(false) }
    }
    fetchAudit()
  }, [isAdmin, isManager, selectedRep, userEmail])

  // ==========================================
  // CARGA DE DATOS PARA MODO: "GESTIÓN PROPIA"
  // ==========================================
  useEffect(() => {
    if (isAdmin) return;
    if (isManager && selectedRep !== userEmail) return;

    const fetchRepData = async () => {
      setLoading(true)
      try {
        const qPlanned = query(collection(db, 'planned_visits'), 
          where('userEmail', '==', userEmail), 
          where('visitDate', '==', todayStr)
        )
        const snapPlanned = await getDocs(qPlanned)
        setVisits(snapPlanned.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter((v: any) => v.status === 'Planeada'))

        const qReports = query(collection(db, 'visit_reports'),
          where('userEmail', '==', userEmail)
        )
        const snapReports = await getDocs(qReports)
        let history = snapReports.docs.map(d => ({ id: d.id, ...d.data() } as any))

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        history = history.filter(r => {
           const rDate = r.reportedAt?.toDate ? r.reportedAt.toDate() : new Date(r.reportedAt)
           return rDate >= thirtyDaysAgo
        }).sort((a, b) => {
           const dA = a.reportedAt?.toDate ? a.reportedAt.toDate() : new Date(a.reportedAt)
           const dB = b.reportedAt?.toDate ? b.reportedAt.toDate() : new Date(b.reportedAt)
           return dB.getTime() - dA.getTime()
        })

        setRepHistory(history)
      } finally { setLoading(false) }
    }
    fetchRepData()
  }, [isAdmin, isManager, selectedRep, userEmail, todayStr])

  const handleSaveReport = async () => {
    if (!selectedVisit) return
    setSaving(true)
    try {
      const locationFingerprint = await getFingerprintLocation()
      const targetEmail = userEmail
      await updateDoc(doc(db, 'planned_visits', selectedVisit.id), { status: 'Realizada', reportedAt: Timestamp.now() })
      
      const reportData: any = {
        visitId: selectedVisit.id, userEmail: targetEmail, doctorName: selectedVisit.doctorName,
        observations: obs, samples, reportedAt: Timestamp.now(), status
      };
      if (locationFingerprint) reportData.locationFingerprint = locationFingerprint;

      const newReportRef = await addDoc(collection(db, 'visit_reports'), reportData)
      
      setVisits(prev => prev.filter(v => v.id !== selectedVisit.id));
      setRepHistory(prev => [{ id: newReportRef.id, ...reportData }, ...prev]);

      alert('¡Reporte guardado con éxito!'); setSelectedVisit(null); setObs(''); setSamples([]);
    } catch (e) { alert('Error al guardar reporte') } finally { setSaving(false) }
  }

  const exportCSV = async () => {
    let csv = "Fecha,Visitador,Medico,Estado,Muestras,Observaciones\n";
    auditReports.forEach(r => {
      const s = r.samples?.map((x:any) => `${x.qty}x ${x.name}`).join(' | ') || 'N/A';
      csv += `${r.reportedAt?.toDate ? r.reportedAt.toDate().toLocaleDateString() : new Date(r.reportedAt).toLocaleDateString()},${r.userEmail},"${r.doctorName}",${r.status},"${s}","${r.observations || ''}"\n`;
    });
    await downloadCSV(csv, `Auditoria_Farmaser_${selectedRep}.csv`)
  }

  // Lógica Híbrida: ¿Muestra Auditoría o Muestra Gestión Propia?
  const isViewingAudit = isAdmin || (isManager && selectedRep !== userEmail)

  return (
    <div className="p-4 pt-20 lg:p-10 lg:ml-64 max-w-[1400px] min-h-screen bg-[#F5F5F7]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {isViewingAudit ? 'Auditoría Mensual' : 'Reportar Cita'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isViewingAudit ? `Vista de control · ${selectedRep}` : `Gestión del día · ${todayStr}`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        {(isAdmin || isManager) && (
          <div className="bg-white px-3 py-2.5 rounded-2xl shadow-sm border border-black/[0.06] flex items-center gap-2.5 w-full sm:w-auto">
            <Filter size={15} className="text-indigo-500 ml-1 shrink-0"/>
            <div className="pr-2 w-full">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Vista activa</p>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="w-full text-sm font-semibold text-gray-800 bg-transparent border-none outline-none pr-4 cursor-pointer">
                {isAdmin ? (
                  <option value="Todos">Toda la Empresa</option>
                ) : (
                  <>
                    <option value="Todos">Consolidado Equipo</option>
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

      {isViewingAudit ? (
        <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="flex items-center gap-2.5">
               <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
               <h2 className="font-semibold text-gray-900 text-sm">Historial Consolidado</h2>
             </div>
             <button onClick={exportCSV} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98]">
                <Download size={16}/> Descargar Excel
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                  <th className="px-8 py-5">Fecha</th>
                  <th className="px-8 py-5">Visitador</th>
                  <th className="px-8 py-5">Médico / Institución</th>
                  <th className="px-8 py-5 text-center">Estado</th>
                  <th className="px-8 py-5">Muestras</th>
                  <th className="px-8 py-5">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingAudit ? (
                  <tr><td colSpan={6} className="p-20 text-center text-gray-300 font-bold animate-pulse italic uppercase">Sincronizando...</td></tr>
                ) : auditReports.length === 0 ? (
                  <tr><td colSpan={6} className="p-20 text-center text-gray-300 font-bold uppercase text-xs">Sin registros para {selectedRep}</td></tr>
                ) : auditReports.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-8 py-5 text-[10px] font-bold text-gray-400 whitespace-nowrap">{r.reportedAt?.toDate ? r.reportedAt.toDate().toLocaleDateString() : new Date(r.reportedAt).toLocaleDateString()}</td>
                    <td className="px-8 py-5 text-xs font-black text-blue-600 italic underline decoration-blue-100">{r.userEmail}</td>
                    <td className="px-8 py-5 text-xs font-black text-gray-900 uppercase">{r.doctorName}</td>
                    <td className="px-8 py-5 text-center">
                      <span className="bg-green-100 text-green-700 text-[9px] font-black px-3 py-1 rounded-lg uppercase border border-green-200">REALIZADA</span>
                    </td>
                    <td className="px-8 py-5 text-[10px] text-gray-400 font-bold italic">
                      {r.samples?.length > 0 ? r.samples.map((s:any) => `${s.qty}x ${s.name}`).join(', ') : 'N/A'}
                    </td>
                    <td className="px-8 py-5 text-[10px] text-gray-500 font-medium max-w-[300px] truncate">{r.observations || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-[1200px]">
           {!selectedVisit ? (
             <div className="space-y-4">
               <div className="flex flex-col sm:flex-row gap-3 mb-8">
                 <button onClick={() => setActiveTab('pendientes')} className={`flex-1 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'pendientes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-400 border border-gray-100'}`}><Package size={14}/> Pendientes Hoy</button>
                 <button onClick={() => setActiveTab('historial')} className={`flex-1 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'historial' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-400 border border-gray-100'}`}><History size={14}/> Historial (30 Días)</button>
               </div>

               {loading ? <div className="p-20 text-center font-black text-gray-300 animate-pulse uppercase tracking-widest">Sincronizando...</div> :
                activeTab === 'pendientes' ? (
                  <div className="space-y-4">
                    {visits.length === 0 ? (
                      <div className="bg-white p-12 rounded-[40px] text-center border border-dashed border-gray-200">
                        <Package className="text-gray-200 mb-4 mx-auto" size={48} />
                        <p className="text-gray-400 font-bold uppercase text-[10px]">No tienes citas pendientes para hoy.</p>
                      </div>
                    ) : (
                      visits.map(v => (
                        <button key={v.id} onClick={() => setSelectedVisit(v)} className="w-full bg-white p-6 rounded-[35px] border border-gray-100 flex items-center justify-between hover:border-blue-600 transition-all shadow-sm group">
                          <div className="flex items-center gap-4 text-left">
                             <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0"><User size={24}/></div>
                             <div className="min-w-0">
                               <p className="font-black text-gray-900 uppercase leading-none mb-1 text-sm truncate">{v.doctorName}</p>
                               <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-gray-400 uppercase">
                                 <span className="text-blue-600 shrink-0">{v.startTime}</span>
                                 <span>•</span>
                                 <span className="truncate">{v.doctorDetails?.specialty}</span>
                                 <span>•</span>
                                 <span className="truncate">{v.doctorDetails?.city}</span>
                               </div>
                             </div>
                          </div>
                          <div className="bg-blue-600 px-6 py-2 rounded-xl text-[10px] font-black text-white uppercase shadow-md hidden sm:block shrink-0 ml-4">REPORTAR</div>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {repHistory.length === 0 ? (
                      <div className="bg-white p-12 rounded-[40px] text-center border border-dashed border-gray-200">
                        <History className="text-gray-200 mb-4 mx-auto" size={48} />
                        <p className="text-gray-400 font-bold uppercase text-[10px]">Sin reportes recientes.</p>
                      </div>
                    ) : (
                      repHistory.map(r => (
                        <div key={r.id} className="w-full bg-white p-6 md:p-8 rounded-[35px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:grid md:grid-cols-12 md:items-center gap-4 md:gap-8">
                            <div className="flex items-center gap-4 md:col-span-4 min-w-0">
                               <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center flex-shrink-0"><CheckCircle size={24}/></div>
                               <div className="min-w-0">
                                 <p className="font-black text-gray-900 uppercase leading-tight mb-2 text-sm truncate">{r.doctorName}</p>
                                 <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                                   <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md">{r.reportedAt?.toDate ? r.reportedAt.toDate().toLocaleDateString() : new Date(r.reportedAt).toLocaleDateString()}</span>
                                   <span className={r.status === 'Realizada' ? 'text-green-500' : 'text-orange-500'}>{r.status}</span>
                                 </div>
                               </div>
                            </div>
                            <div className="md:col-span-6 flex-1">
                              {r.observations ? (
                                <div className="p-4 bg-gray-50 rounded-[24px] border-l-4 border-blue-400 h-full flex flex-col justify-center">
                                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter mb-1 flex items-center gap-1"><MessageSquare size={10} /> Seguimiento Anterior:</p>
                                  <p className="text-[11px] text-gray-600 font-medium leading-relaxed italic">{r.observations}</p>
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-300 italic">Sin observaciones.</p>
                              )}
                            </div>
                            <div className="md:col-span-2 text-left md:text-right border-t md:border-none pt-3 md:pt-0">
                              <p className="text-[9px] font-bold text-gray-500 italic leading-tight">{r.samples?.length > 0 ? r.samples.map((s:any) => `${s.qty}x ${s.name}`).join(', ') : 'Sin muestras'}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
             </div>
           ) : (
             <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 animate-in zoom-in-95">
                <button onClick={() => { setSelectedVisit(null); setObs(''); setSamples([]); }} className="mb-8 text-gray-400 font-black uppercase text-[10px] flex items-center gap-2 hover:text-red-500 transition-colors"><X size={14}/> Cancelar y Volver</button>
                <div className="mb-10 pb-6 border-b border-gray-50">
                   <h2 className="text-3xl font-black uppercase text-gray-900 tracking-tighter mb-2">{selectedVisit.doctorName}</h2>
                   <p className="text-xs font-bold text-gray-400 uppercase flex flex-wrap items-center gap-2 italic"><MapPin size={14} className="text-blue-500 shrink-0"/> {selectedVisit.doctorDetails?.address} — {selectedVisit.doctorDetails?.city}</p>
                </div>
                <div className="space-y-12">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-4 tracking-widest text-center">Estado del encuentro</label>
                    <div className="flex gap-4">
                      {['Realizada', 'Reprogramada'].map(s => (
                        <button key={s} type="button" onClick={() => setStatus(s)} className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase border-2 transition-all ${status === s ? 'border-blue-600 bg-blue-600 text-white shadow-xl scale-105' : 'border-gray-50 text-gray-300 bg-gray-50/50'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-4 tracking-widest text-center">Entrega de Muestras Médicas</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-8">
                      {products.map(p => (
                        <button key={p.id} onClick={() => {
                          const exists = samples.find(s => s.productId === p.id);
                          if (exists) setSamples(samples.map(s => s.productId === p.id ? {...s, qty: s.qty+1} : s));
                          else setSamples([...samples, { productId: p.id, name: p.name, qty: 1 }]);
                        }} className="p-3 bg-gray-50 rounded-xl text-[9px] font-black uppercase text-gray-400 hover:bg-blue-600 hover:text-white transition-all text-center leading-tight">{p.name}</button>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {samples.map(s => (
                        <div key={s.productId} className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm animate-in slide-in-from-right duration-300">
                          <span className="text-[11px] font-black uppercase text-blue-700 text-center sm:text-left">{s.name}</span>
                          <div className="flex items-center gap-5">
                            <button onClick={() => setSamples(samples.map(x => x.productId === s.productId ? {...x, qty: Math.max(0, x.qty-1)} : x).filter(x => x.qty > 0))} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 active:scale-90 transition-transform"><Minus size={16}/></button>
                            <span className="font-black text-blue-800 text-lg">{s.qty}</span>
                            <button onClick={() => setSamples(samples.map(x => x.productId === s.productId ? {...x, qty: x.qty+1} : x))} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 active:scale-90 transition-transform"><Plus size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-4 tracking-widest text-center">Observaciones y Notas</label>
                    <div className="relative">
                      <MessageSquare className="absolute top-5 left-5 text-gray-300" size={20}/>
                      <textarea value={obs} onChange={e => setObs(e.target.value)} rows={4} className="w-full bg-gray-50 rounded-[30px] p-6 pl-14 text-sm font-bold border-none focus:ring-2 focus:ring-blue-600 shadow-inner" placeholder="Escribe aquí los detalles del encuentro..."/>
                    </div>
                  </div>
                  
                  <button disabled={saving} onClick={handleSaveReport} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] py-6 rounded-[30px] shadow-2xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3">
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20}/> Guardar Reporte Final</>}
                  </button>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  )
}