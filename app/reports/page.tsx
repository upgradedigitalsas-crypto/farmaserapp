'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp, orderBy } from 'firebase/firestore'
import { User, MapPin, Plus, Minus, CheckCircle, Loader2, X, MessageSquare, Package, AlertCircle, Filter, Download, Briefcase } from 'lucide-react'

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
  
  const [selectedVisit, setSelectedVisit] = useState<any>(null)
  const [obs, setObs] = useState('')
  const [status, setStatus] = useState('Realizada')
  const [samples, setSamples] = useState<any[]>([]) 
  
  const todayStr = new Date().toISOString().slice(0, 10)
  const isAdmin = user?.email?.toLowerCase().trim() === 'entrenamientofarmaser@gmail.com'

  // 1. CARGA INICIAL (Médicos y Productos para el catálogo)
  useEffect(() => {
    fetch('/api/doctors').then(res => res.json()).then(data => setDoctors(Array.isArray(data) ? data : []))
    fetch('/api/products').then(res => res.json()).then(data => setProducts(Array.isArray(data) ? data : []))
  }, [])

  const repsList = useMemo(() => {
    return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#'))))
  }, [doctors])

  // 2. AUDITORÍA (PARA ADMIN: TABLA PROFESIONAL)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchAudit = async () => {
      setLoadingAudit(true)
      try {
        const q = query(collection(db, 'visit_reports'), orderBy('reportedAt', 'desc'));
        const snap = await getDocs(q);
        const allData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (selectedRep === 'Todos') {
          setAuditReports(allData);
        } else {
          const filtered = allData.filter((r: any) => 
            String(r.userEmail || '').toLowerCase().trim() === selectedRep.toLowerCase().trim()
          );
          setAuditReports(filtered);
        }
      } catch (e) { console.error("Error auditoría:", e) } finally { setLoadingAudit(false) }
    }
    fetchAudit()
  }, [isAdmin, selectedRep])

  // 3. VISITAS DE HOY (PARA VISITADORES)
  useEffect(() => {
    if (isAdmin) return;
    const fetchToday = async () => {
      setLoading(true)
      try {
        const q = query(collection(db, 'planned_visits'), 
          where('userEmail', '==', user?.email?.toLowerCase()), 
          where('visitDate', '==', todayStr)
        )
        const snap = await getDocs(q)
        setVisits(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter((v: any) => v.status === 'Planeada'))
      } finally { setLoading(false) }
    }
    fetchToday()
  }, [user, isAdmin, todayStr])

  const handleSaveReport = async () => {
    if (!selectedVisit) return
    setSaving(true)
    try {
      const locationFingerprint = await getFingerprintLocation()
      const targetEmail = user?.email?.toLowerCase()
      await updateDoc(doc(db, 'planned_visits', selectedVisit.id), { status: 'Realizada', reportedAt: Timestamp.now() })
      
      const reportData: any = {
        visitId: selectedVisit.id, userEmail: targetEmail, doctorName: selectedVisit.doctorName,
        observations: obs, samples, reportedAt: Timestamp.now(), status
      };
      if (locationFingerprint) reportData.locationFingerprint = locationFingerprint;

      await addDoc(collection(db, 'visit_reports'), reportData)
      alert('¡Reporte guardado con éxito!'); setSelectedVisit(null); setObs(''); setSamples([]);
    } catch (e) { alert('Error al guardar reporte') } finally { setSaving(false) }
  }

  const exportCSV = () => {
    let csv = "Fecha,Visitador,Medico,Estado,Muestras,Observaciones\n";
    auditReports.forEach(r => {
      const s = r.samples?.map((x:any) => `${x.qty}x ${x.name}`).join(' | ') || 'N/A';
      csv += `${r.reportedAt?.toDate().toLocaleDateString()},${r.userEmail},${r.doctorName},${r.status},"${s}","${r.observations || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Auditoria_Farmaser_${selectedRep}.csv`);
    document.body.appendChild(link);
    link.click();
  }

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1400px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">
            {isAdmin ? 'Auditoría Mensual' : 'Reportar Cita'}
          </h1>
          <p className="text-gray-400 font-bold text-[10px] tracking-widest uppercase mt-2 italic italic">
            {isAdmin ? `VISTA DE CONTROL: ${selectedRep}` : `GESTIÓN DEL DÍA: ${todayStr}`}
          </p>
        </div>

        {isAdmin && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <Filter size={20} className="text-indigo-600 ml-2"/>
            <div className="pr-3">
              <p className="text-[9px] font-black text-gray-300 uppercase leading-none mb-1">Filtrar Visitador</p>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none pr-4">
                <option value="Todos">Toda la Empresa</option>
                {repsList.map((email) => <option key={email} value={email}>{email}</option>)}
              </select>
            </div>
          </div>
        )}
      </header>

      {isAdmin ? (
        /* 📊 VISTA SUPER ADMIN: TABLA PROFESIONAL (ESTILO 9:36 AM) */
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-white">
             <div className="flex items-center gap-3">
               <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
               <h2 className="font-black uppercase text-gray-900 text-sm tracking-tighter italic">Historial Consolidado</h2>
             </div>
             <button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-green-100">
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
                    <td className="px-8 py-5 text-[10px] font-bold text-gray-400 whitespace-nowrap">{r.reportedAt?.toDate().toLocaleDateString()}</td>
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
        /* 📱 VISTA VISITADOR: LISTA Y FORMULARIO COMPLETO RESTAURADO */
        <div className="max-w-[900px]">
           {!selectedVisit ? (
             <div className="space-y-4">
               {loading ? <div className="p-20 text-center font-black text-gray-300 animate-pulse uppercase tracking-widest">Abriendo Agenda...</div> :
                visits.length === 0 ? (
                  <div className="bg-white p-12 rounded-[40px] text-center border border-dashed border-gray-200">
                    <Package className="text-gray-200 mb-4 mx-auto" size={48} />
                    <p className="text-gray-400 font-bold uppercase text-[10px]">No tienes citas pendientes para hoy.</p>
                  </div>
                ) : (
                  visits.map(v => (
                    <button key={v.id} onClick={() => setSelectedVisit(v)} className="w-full bg-white p-6 rounded-[35px] border border-gray-100 flex items-center justify-between hover:border-blue-600 transition-all shadow-sm group">
                      <div className="flex items-center gap-4 text-left">
                         <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><User size={24}/></div>
                         <div>
                           <p className="font-black text-gray-900 uppercase leading-none mb-1 text-sm">{v.doctorName}</p>
                           <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                             <span className="text-blue-600">{v.startTime}</span>
                             <span>•</span>
                             <span>{v.doctorDetails?.specialty}</span>
                             <span>•</span>
                             <span>{v.doctorDetails?.city}</span>
                           </div>
                         </div>
                      </div>
                      <div className="bg-blue-600 px-6 py-2 rounded-xl text-[10px] font-black text-white uppercase shadow-md">REPORTAR</div>
                    </button>
                  ))
                )}
             </div>
           ) : (
             /* 🛠️ FORMULARIO DE REPORTE (RESTAURADO AL 100%) */
             <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 animate-in zoom-in-95">
                <button onClick={() => { setSelectedVisit(null); setObs(''); setSamples([]); }} className="mb-8 text-gray-400 font-black uppercase text-[10px] flex items-center gap-2 hover:text-red-500 transition-colors">
                  <X size={14}/> Cancelar y Volver
                </button>
                
                <div className="mb-10 pb-6 border-b border-gray-50">
                   <h2 className="text-3xl font-black uppercase text-gray-900 tracking-tighter mb-2">{selectedVisit.doctorName}</h2>
                   <p className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 italic">
                     <MapPin size={14} className="text-blue-500"/> {selectedVisit.doctorDetails?.address} — {selectedVisit.doctorDetails?.city}
                   </p>
                </div>

                <div className="space-y-12">
                  {/* ESTADO */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-4 tracking-widest text-center">Estado del encuentro</label>
                    <div className="flex gap-4">
                      {['Realizada', 'Reprogramada'].map(s => (
                        <button key={s} type="button" onClick={() => setStatus(s)} className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase border-2 transition-all ${status === s ? 'border-blue-600 bg-blue-600 text-white shadow-xl scale-105' : 'border-gray-50 text-gray-300 bg-gray-50/50'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CATÁLOGO Y MUESTRAS MÉDICAS */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-4 tracking-widest text-center">Entrega de Muestras Médicas</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-8">
                      {products.map(p => (
                        <button key={p.id} onClick={() => {
                          const exists = samples.find(s => s.productId === p.id);
                          if (exists) setSamples(samples.map(s => s.productId === p.id ? {...s, qty: s.qty+1} : s));
                          else setSamples([...samples, { productId: p.id, name: p.name, qty: 1 }]);
                        }} className="p-3 bg-gray-50 rounded-xl text-[9px] font-black uppercase text-gray-400 hover:bg-blue-600 hover:text-white transition-all text-center leading-tight">
                          {p.name}
                        </button>
                      ))}
                    </div>
                    
                    {/* LISTADO DE MUESTRAS SELECCIONADAS */}
                    <div className="space-y-3">
                      {samples.map(s => (
                        <div key={s.productId} className="flex items-center justify-between bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm animate-in slide-in-from-right duration-300">
                          <span className="text-[11px] font-black uppercase text-blue-700">{s.name}</span>
                          <div className="flex items-center gap-5">
                            <button onClick={() => setSamples(samples.map(x => x.productId === s.productId ? {...x, qty: Math.max(0, x.qty-1)} : x).filter(x => x.qty > 0))} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 active:scale-90 transition-transform"><Minus size={16}/></button>
                            <span className="font-black text-blue-800 text-lg">{s.qty}</span>
                            <button onClick={() => setSamples(samples.map(x => x.productId === s.productId ? {...x, qty: x.qty+1} : x))} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 active:scale-90 transition-transform"><Plus size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* OBSERVACIONES */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-4 tracking-widest text-center">Observaciones y Notas</label>
                    <div className="relative">
                      <MessageSquare className="absolute top-5 left-5 text-gray-300" size={20}/>
                      <textarea value={obs} onChange={e => setObs(e.target.value)} rows={4} className="w-full bg-gray-50 rounded-[30px] p-6 pl-14 text-sm font-bold border-none focus:ring-2 focus:ring-blue-600 shadow-inner" placeholder="Escribe aquí los detalles del encuentro..."/>
                    </div>
                  </div>

                  {/* BOTÓN FINAL */}
                  <button onClick={handleSaveReport} disabled={saving} className="w-full bg-green-600 text-white font-black py-7 rounded-[30px] uppercase text-xs tracking-[0.3em] shadow-2xl shadow-green-200 flex items-center justify-center gap-4 active:scale-95 transition-all">
                    {saving ? <Loader2 className="animate-spin" size={22}/> : <CheckCircle size={22}/>} Finalizar y Guardar Reporte
                  </button>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  )
}
