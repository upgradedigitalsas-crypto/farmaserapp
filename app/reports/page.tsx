'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore'
import { User, MapPin, Plus, Minus, CheckCircle, Loader2, X, MessageSquare, Package, AlertCircle, Filter, Download } from 'lucide-react'

export default function ReportsPage() {
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [loadingProd, setLoadingProd] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [doctors, setDoctors] = useState<any[]>([]) 
  const [visits, setVisits] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [selectedVisit, setSelectedVisit] = useState<any>(null)
  const [obs, setObs] = useState('')
  const [status, setStatus] = useState('Realizada')
  const [samples, setSamples] = useState<any[]>([]) 
  
  // ESTADOS NUEVOS PARA EL ADMIN
  const [adminReports, setAdminReports] = useState<any[]>([])
  const [loadingAdmin, setLoadingAdmin] = useState(true)
  
  const todayStr = new Date().toISOString().slice(0, 10)
  const currentMonth = todayStr.slice(0, 7) // Ej: "2026-04"
  const isAdmin = user?.email?.toLowerCase().trim() === 'entrenamientofarmaser@gmail.com'

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/doctors').then(res => res.json()).then(data => {
        setDoctors(Array.isArray(data) ? data : [])
      })
    }
  }, [isAdmin])

  const repsList = useMemo(() => {
    if (!isAdmin) return []
    return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#'))))
  }, [doctors, isAdmin])

  // LÓGICA DIVIDIDA: ADMIN vs VISITADOR
  useEffect(() => {
    if (!user?.email) return;

    if (isAdmin) {
      // 🟢 LÓGICA ADMIN: Cargar reportes del mes (CORREGIDO PARA TYPESCRIPT)
      const fetchAdminReports = async () => {
        setLoadingAdmin(true);
        try {
          const reportsRef = collection(db, 'visit_reports');
          const q = selectedRep === 'Todos' 
            ? query(reportsRef) 
            : query(reportsRef, where('userEmail', '==', selectedRep.toLowerCase().trim()));
            
          const snap = await getDocs(q);
          
          let data = snap.docs.map(d => {
            const r = d.data();
            const dateObj = r.reportedAt ? r.reportedAt.toDate() : new Date();
            const localDateStr = dateObj.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
            return { id: d.id, ...r, localDateStr, ms: dateObj.getTime() };
          });
          
          // Filtramos solo los del mes actual y ordenamos por los más recientes
          data = data.filter(r => r.localDateStr.startsWith(currentMonth));
          data.sort((a, b) => b.ms - a.ms);
          
          setAdminReports(data);
        } catch (e) {
          console.error("Error Admin:", e);
        } finally {
          setLoadingAdmin(false);
          setLoading(false); 
        }
      };
      fetchAdminReports();

    } else {
      // 🔵 LÓGICA VISITADOR: Cargar visitas de hoy pendientes
      const fetchTodayVisits = async () => {
        setLoading(true);
        try {
          const targetEmail = user.email.toLowerCase();
          const q = query(collection(db, 'planned_visits'), where('userEmail', '==', targetEmail), where('visitDate', '==', todayStr));
          const snap = await getDocs(q);
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
          
          setVisits(data.filter((v: any) => v.status === 'Planeada'));

          const res = await fetch('/api/products');
          const prodData = await res.json();
          if (prodData.error) setErrorMsg(prodData.error);
          else setProducts(Array.isArray(prodData) ? prodData : []);

        } catch (e: any) { 
          setErrorMsg("Error al conectar con la base de datos");
        } finally { 
          setLoading(false); 
          setLoadingProd(false); 
        }
      };
      fetchTodayVisits();
    }
  }, [user, todayStr, currentMonth, selectedRep, isAdmin]);

  const addSample = (p: any) => {
    const exists = samples.find(s => s.productId === p.id)
    if (exists) {
      setSamples(samples.map(s => s.productId === p.id ? { ...s, qty: s.qty + 1 } : s))
    } else {
      setSamples([...samples, { productId: p.id, name: p.name, qty: 1 }])
    }
  }

  const updateQty = (id: string, delta: number) => {
    setSamples(samples.map(s => s.productId === id ? { ...s, qty: Math.max(0, s.qty + delta) } : s).filter(s => s.qty > 0))
  }

  const handleSaveReport = async () => {
    if (!selectedVisit) return
    setSaving(true)
    try {
      const targetEmail = user?.email?.toLowerCase()
      
      await updateDoc(doc(db, 'planned_visits', selectedVisit.id), { 
        status: 'Realizada', 
        reportedAt: Timestamp.now() 
      })

      await addDoc(collection(db, 'visit_reports'), {
        visitId: selectedVisit.id, 
        userEmail: targetEmail, 
        doctorName: selectedVisit.doctorName,
        observations: obs, 
        samples, 
        reportedAt: Timestamp.now(), 
        status
      })

      alert('¡Reporte guardado con éxito!')
      setSelectedVisit(null)
      setVisits(visits.filter(v => v.id !== selectedVisit.id))
      setObs('')
      setSamples([])
    } catch (e) { 
      alert('Error al guardar reporte') 
    } finally { 
      setSaving(false) 
    }
  }

  // FUNCIÓN PARA EXPORTAR CSV (SOLO ADMIN)
  const exportCSV = () => {
    const headers = ['Fecha', 'Visitador', 'Medico', 'Estado', 'Muestras', 'Observaciones'];
    const rows = adminReports.map((r: any) => {
      const samplesStr = r.samples && r.samples.length > 0 ? r.samples.map((s:any) => `${s.qty}x ${s.name}`).join(' | ') : 'Sin Muestras';
      const obsStr = r.observations ? String(r.observations).replace(/"/g, '""').replace(/\n/g, ' ') : 'Sin Observaciones';
      return [
        r.localDateStr,
        r.userEmail,
        `"${r.doctorName}"`,
        r.status,
        `"${samplesStr}"`,
        `"${obsStr}"`
      ].join(',');
    });
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reportes_${selectedRep}_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="lg:ml-64 p-20 text-center font-black text-gray-400 animate-pulse">Sincronizando información...</div>

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1200px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">
            {isAdmin ? 'Auditoría Mensual' : 'Reportar Cita'}
          </h1>
          <p className="text-gray-400 font-bold text-[10px] tracking-widest uppercase mt-2 italic">
            {isAdmin ? `Historial del mes: ${currentMonth}` : `Fecha de gestión: ${todayStr}`}
          </p>
        </div>

        {isAdmin && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600"><Filter size={20}/></div>
            <div className="pr-3">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Filtrar Visitador</p>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer appearance-none">
                <option value="Todos">Toda la Empresa</option>
                {repsList.map((email) => <option key={email} value={email}>{email}</option>)}
              </select>
            </div>
          </div>
        )}
      </header>

      {isAdmin ? (
        // ================= VISTA SUPER ADMIN (TABLA MENSUAL) =================
        <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-black uppercase text-gray-900 tracking-tighter">Reportes {currentMonth}</h2>
            <button onClick={exportCSV} className="bg-green-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-200 active:scale-95">
              <Download size={16} /> Descargar Excel
            </button>
          </div>
          
          {loadingAdmin ? (
            <div className="py-20 text-center font-black text-gray-400 text-xs uppercase animate-pulse">Consultando base de datos...</div>
          ) : adminReports.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl">
              <Package size={48} className="text-gray-200 mb-4" />
              <p className="font-bold text-gray-400 text-[10px] uppercase tracking-widest">No hay reportes generados este mes</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-50">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Fecha</th>
                    <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Visitador</th>
                    <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Médico</th>
                    <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Estado</th>
                    <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-48">Muestras</th>
                    <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-64">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {adminReports.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group">
                      <td className="py-4 px-5 text-xs font-bold text-gray-500 whitespace-nowrap">{r.localDateStr}</td>
                      <td className="py-4 px-5 text-xs font-bold text-blue-600">{r.userEmail?.split('@')[0]}</td>
                      <td className="py-4 px-5 text-xs font-black text-gray-900 uppercase">{r.doctorName}</td>
                      <td className="py-4 px-5">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider">{r.status}</span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1">
                          {r.samples && r.samples.length > 0 ? r.samples.map((s:any, i:number) => (
                            <span key={i} className="text-[9px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{s.qty}x {s.name}</span>
                          )) : <span className="text-[10px] font-medium text-gray-300 italic">N/A</span>}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-[10px] font-medium text-gray-500 line-clamp-2" title={r.observations}>
                        {r.observations || <span className="text-gray-300 italic">Sin observaciones</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // ================= VISTA VISITADOR (FLUJO ORIGINAL INTACTO) =================
        !selectedVisit ? (
          <div className="space-y-4 max-w-[1000px]">
            {visits.length === 0 ? (
              <div className="bg-white p-12 rounded-[40px] text-center border border-dashed border-gray-200">
                <Package className="text-gray-200 mb-4 mx-auto" size={48} />
                <p className="text-gray-400 font-bold uppercase text-[10px]">No hay citas pendientes de reporte para hoy.</p>
              </div>
            ) : (
              visits.map(v => (
                <button key={v.id} onClick={() => setSelectedVisit(v)} className="w-full bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-center justify-between hover:border-blue-600 transition-all group">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><User size={24}/></div>
                    <div>
                      <p className="font-black text-gray-900 uppercase leading-none mb-1">{v.doctorName}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">
                        {v.doctorDetails?.specialty} • {v.doctorDetails?.city}
                      </p>
                    </div>
                  </div>
                  <div className="bg-blue-600 px-4 py-2 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-md">REPORTAR</div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 max-w-[1000px]">
            <button onClick={() => setSelectedVisit(null)} className="mb-8 flex items-center gap-2 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors">
              <X size={14}/> Volver a la lista
            </button>
            <div className="mb-8 pb-6 border-b border-gray-50">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">{selectedVisit.doctorName}</h2>
              <p className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><MapPin size={14}/> {selectedVisit.doctorDetails?.address}</p>
            </div>
            <div className="space-y-10">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-4">Estado del encuentro</label>
                <div className="flex gap-4">
                  {['Realizada', 'Reprogramada'].map(s => (
                    <button key={s} type="button" onClick={() => setStatus(s)} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase border-2 transition-all ${status === s ? 'border-blue-600 bg-blue-600 text-white shadow-lg' : 'border-gray-50 text-gray-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-4">Entrega de Muestras</label>
                {loadingProd ? (
                  <div className="p-6 bg-blue-50 rounded-2xl animate-pulse text-blue-600 font-bold text-[10px] uppercase text-center">Consultando catálogo...</div>
                ) : errorMsg ? (
                  <div className="p-6 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-[10px] font-bold uppercase">
                    <AlertCircle size={18} className="mb-2"/> Error: {errorMsg}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
                    {products.map((p: any) => (
                      <button key={p.id} type="button" onClick={() => addSample(p)} className="p-3 bg-gray-50 rounded-xl text-[9px] font-black uppercase text-gray-500 hover:bg-blue-600 hover:text-white transition-all text-center truncate">
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-3">
                  {samples.map(s => (
                    <div key={s.productId} className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-in zoom-in-95">
                      <span className="text-[10px] font-black uppercase text-blue-700">{s.name}</span>
                      <div className="flex items-center gap-4">
                        <button type="button" onClick={() => updateQty(s.productId, -1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm"><Minus size={14}/></button>
                        <span className="font-black text-blue-800 w-4 text-center">{s.qty}</span>
                        <button type="button" onClick={() => updateQty(s.productId, 1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm"><Plus size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-4 tracking-widest">Observación Próxima Visita</label>
                <div className="relative">
                  <MessageSquare className="absolute top-4 left-4 text-gray-300" size={18}/>
                  <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Notas del encuentro..." className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 shadow-inner" />
                </div>
              </div>
              <button disabled={saving} onClick={handleSaveReport} className="w-full bg-green-600 text-white text-[11px] font-black uppercase tracking-[0.2em] py-6 rounded-2xl shadow-xl shadow-green-200 flex items-center justify-center gap-3 active:scale-95 transition-all">
                {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />} Guardar Reporte Final
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
