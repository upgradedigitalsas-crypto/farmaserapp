'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp, orderBy } from 'firebase/firestore'
import { User, MapPin, Plus, Minus, CheckCircle, Loader2, X, MessageSquare, Package, AlertCircle, Filter, Download } from 'lucide-react'

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

  useEffect(() => {
    fetch('/api/doctors').then(res => res.json()).then(data => setDoctors(Array.isArray(data) ? data : []))
    fetch('/api/products').then(res => res.json()).then(data => setProducts(Array.isArray(data) ? data : []))
  }, [])

  const repsList = useMemo(() => {
    return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#'))))
  }, [doctors])

  // 1. AUDITORÍA (FIXED: Ahora carga "Todos" o el "Visitador Seleccionado")
  useEffect(() => {
    if (!isAdmin) return;
    const fetchAudit = async () => {
      setLoadingAudit(true)
      try {
        const reportsRef = collection(db, 'visit_reports');
        let q;
        if (selectedRep === 'Todos') {
          q = query(reportsRef, orderBy('reportedAt', 'desc'));
        } else {
          // Filtramos por el email seleccionado
          q = query(reportsRef, where('userEmail', '==', selectedRep.toLowerCase().trim()), orderBy('reportedAt', 'desc'));
        }
        const snap = await getDocs(q);
        setAuditReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error("Error filtrando:", e) } finally { setLoadingAudit(false) }
    }
    fetchAudit()
  }, [isAdmin, selectedRep])

  // 2. REPORTE DIARIO (PARA VISITADORES)
  useEffect(() => {
    if (isAdmin) return;
    const fetchToday = async () => {
      setLoading(true)
      try {
        const q = query(collection(db, 'planned_visits'), where('userEmail', '==', user?.email?.toLowerCase()), where('visitDate', '==', todayStr))
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
      await updateDoc(doc(db, 'planned_visits', selectedVisit.id), { status: 'Realizada', reportedAt: Timestamp.now() })
      const reportData: any = {
        visitId: selectedVisit.id, userEmail: user?.email?.toLowerCase(), doctorName: selectedVisit.doctorName,
        observations: obs, samples, reportedAt: Timestamp.now(), status
      };
      if (locationFingerprint) reportData.locationFingerprint = locationFingerprint;
      await addDoc(collection(db, 'visit_reports'), reportData)
      alert('¡Reporte guardado!'); setSelectedVisit(null); setObs(''); setSamples([]);
    } catch (e) { alert('Error') } finally { setSaving(false) }
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
          <p className="text-gray-400 font-bold text-[10px] tracking-widest uppercase mt-2 italic">Historial del mes: 2026-04</p>
        </div>

        {isAdmin && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <Filter size={20} className="text-indigo-600 ml-2"/>
            <div className="pr-3">
              <p className="text-[9px] font-black text-gray-300 uppercase leading-none mb-1">Filtrar Base</p>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none pr-4">
                <option value="Todos">Toda la Empresa</option>
                {repsList.map((email) => <option key={email} value={email}>{email}</option>)}
              </select>
            </div>
          </div>
        )}
      </header>

      {isAdmin ? (
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-white">
             <div className="flex items-center gap-3">
               <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
               <h2 className="font-black uppercase text-gray-900 text-sm tracking-tighter">Historial de Visitas Realizadas</h2>
             </div>
             {/* 🟢 BOTÓN VERDE RESTAURADO */}
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
                  <th className="px-8 py-5">Muestras Entregadas</th>
                  <th className="px-8 py-5">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingAudit ? (
                  <tr><td colSpan={6} className="p-20 text-center text-gray-300 font-bold animate-pulse italic">Cargando datos filtrados...</td></tr>
                ) : auditReports.length === 0 ? (
                  <tr><td colSpan={6} className="p-20 text-center text-gray-300 font-bold uppercase text-xs">Sin reportes para esta selección.</td></tr>
                ) : auditReports.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-8 py-5 text-[10px] font-bold text-gray-400 whitespace-nowrap">{r.reportedAt?.toDate().toLocaleDateString()}</td>
                    <td className="px-8 py-5 text-xs font-black text-blue-600 italic">{r.userEmail}</td>
                    <td className="px-8 py-5 text-xs font-black text-gray-900 uppercase">{r.doctorName}</td>
                    <td className="px-8 py-5 text-center">
                      <span className="bg-green-100 text-green-700 text-[9px] font-black px-3 py-1 rounded-lg uppercase border border-green-200">REALIZADA</span>
                    </td>
                    <td className="px-8 py-5 text-[10px] text-gray-400 font-bold italic">
                      {r.samples?.length > 0 ? r.samples.map((s:any) => `${s.qty}x ${s.name}`).join(', ') : 'Sin Muestras'}
                    </td>
                    <td className="px-8 py-5 text-[10px] text-gray-500 font-medium max-w-[300px] truncate">{r.observations || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA VISITADOR MANTENIDA */
        <div className="max-w-[900px]">
           {!selectedVisit ? (
             <div className="space-y-4">
               {loading ? <div className="p-20 text-center font-black text-gray-300 animate-pulse uppercase">Cargando...</div> :
                visits.length === 0 ? (
                  <div className="bg-white p-12 rounded-[40px] text-center border border-dashed border-gray-200">
                    <Package className="text-gray-200 mb-4 mx-auto" size={48} />
                    <p className="text-gray-400 font-bold uppercase text-[10px]">No tienes citas pendientes para reportar hoy.</p>
                  </div>
                ) : (
                  visits.map(v => (
                    <button key={v.id} onClick={() => setSelectedVisit(v)} className="w-full bg-white p-6 rounded-[35px] border border-gray-100 flex items-center justify-between hover:border-blue-600 transition-all shadow-sm group">
                      <div className="flex items-center gap-4 text-left">
                         <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><User size={24}/></div>
                         <div>
                           <p className="font-black text-gray-900 uppercase leading-none mb-1 text-sm">{v.doctorName}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase">{v.doctorDetails?.specialty} • {v.doctorDetails?.city}</p>
                         </div>
                      </div>
                      <div className="bg-blue-600 px-6 py-2 rounded-xl text-[10px] font-black text-white uppercase shadow-md">REPORTAR</div>
                    </button>
                  ))
                )}
             </div>
           ) : (
             <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 animate-in zoom-in-95">
                <button onClick={() => setSelectedVisit(null)} className="mb-8 text-gray-400 font-black uppercase text-[10px] flex items-center gap-2 hover:text-red-500 transition-colors"><X size={14}/> Volver</button>
                <h2 className="text-3xl font-black uppercase text-gray-900 tracking-tighter mb-8">{selectedVisit.doctorName}</h2>
                <div className="space-y-10">
                  <textarea value={obs} onChange={e => setObs(e.target.value)} rows={4} className="w-full bg-gray-50 rounded-3xl p-6 text-sm font-bold border-none focus:ring-2 focus:ring-blue-600" placeholder="Notas de la visita..."/>
                  <button onClick={handleSaveReport} disabled={saving} className="w-full bg-green-600 text-white font-black py-6 rounded-3xl uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3">
                    {saving ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle size={20}/>} Guardar Reporte Final
                  </button>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  )
}
