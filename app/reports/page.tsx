'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore'
import { User, MapPin, Plus, Minus, CheckCircle, Loader2, X, MessageSquare, Package, AlertCircle, Filter } from 'lucide-react'

// Función para obtener la huella GPS silenciosamente
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
  
  const todayStr = new Date().toISOString().slice(0, 10)
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

  useEffect(() => {
    const fetchTodayVisits = async () => {
      if (!user?.email) return
      setLoading(true)
      try {
        let q;
        const visitsRef = collection(db, 'planned_visits')

        if (isAdmin && selectedRep === 'Todos') {
          q = query(visitsRef, where('visitDate', '==', todayStr))
        } else {
          const targetEmail = isAdmin ? selectedRep : user.email.toLowerCase()
          q = query(visitsRef, where('userEmail', '==', targetEmail), where('visitDate', '==', todayStr))
        }

        const snap = await getDocs(q)
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        setVisits(data.filter((v: any) => v.status === 'Planeada'))

        const res = await fetch('/api/products')
        const prodData = await res.json()
        if (prodData.error) setErrorMsg(prodData.error)
        else setProducts(Array.isArray(prodData) ? prodData : [])

      } catch (e: any) { 
        setErrorMsg("Error al conectar con la base de datos")
      } finally { 
        setLoading(false) 
        setLoadingProd(false) 
      }
    }
    fetchTodayVisits()
  }, [user, todayStr, selectedRep, isAdmin])

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
    if (isAdmin && selectedRep === 'Todos') return alert('Debes seleccionar un visitador específico para reportar en su nombre')

    setSaving(true)
    try {
      // Capturamos el GPS antes de enviar a Firebase
      const locationFingerprint = await getFingerprintLocation()
      const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase()
      
      await updateDoc(doc(db, 'planned_visits', selectedVisit.id), { 
        status: 'Realizada', 
        reportedAt: Timestamp.now() 
      })

      const reportData: any = {
        visitId: selectedVisit.id, 
        userEmail: targetEmail, 
        doctorName: selectedVisit.doctorName,
        observations: obs, 
        samples, 
        reportedAt: Timestamp.now(), 
        status
      };

      // Si obtuvimos la ubicación, se la inyectamos al reporte
      if (locationFingerprint) {
        reportData.locationFingerprint = locationFingerprint;
      }

      await addDoc(collection(db, 'visit_reports'), reportData)

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

  if (loading) return <div className="lg:ml-64 p-20 text-center font-black text-gray-400 animate-pulse">Sincronizando hoy...</div>

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1000px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">Reportar Cita</h1>
          <p className="text-gray-400 font-bold text-[10px] tracking-widest uppercase mt-2 italic">Fecha de gestión: {todayStr}</p>
        </div>

        {isAdmin && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600"><Filter size={20}/></div>
            <div className="pr-3">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Supervisando Hoy</p>
              <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer appearance-none">
                <option value="Todos">Toda la Empresa</option>
                {repsList.map((email) => <option key={email} value={email}>{email}</option>)}
              </select>
            </div>
          </div>
        )}
      </header>

      {!selectedVisit ? (
        <div className="space-y-4">
          {visits.length === 0 ? (
            <div className="bg-white p-12 rounded-[40px] text-center border border-dashed border-gray-200">
              <Package className="text-gray-200 mb-4 mx-auto" size={48} />
              <p className="text-gray-400 font-bold uppercase text-[10px]">No hay citas pendientes de reporte para {isAdmin && selectedRep === 'Todos' ? 'la empresa' : (isAdmin ? selectedRep : 'hoy')}.</p>
            </div>
          ) : (
            visits.map(v => (
              <button key={v.id} onClick={() => setSelectedVisit(v)} className="w-full bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-center justify-between hover:border-blue-600 transition-all group">
                <div className="flex items-center gap-4 text-left">
                   <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><User size={24}/></div>
                   <div>
                     <p className="font-black text-gray-900 uppercase leading-none mb-1">{v.doctorName}</p>
                     <p className="text-[10px] font-bold text-gray-400 uppercase">
                        {isAdmin && selectedRep === 'Todos' && <span className="text-blue-600 font-black">{v.userEmail} • </span>}
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
        <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100">
          <button onClick={() => setSelectedVisit(null)} className="mb-8 flex items-center gap-2 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors">
            <X size={14}/> Volver a la lista
          </button>
          <div className="mb-8 pb-6 border-b border-gray-50">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">{selectedVisit.doctorName}</h2>
            <p className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><MapPin size={14}/> {selectedVisit.doctorDetails?.address || 'Dirección no registrada'}</p>
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
      )}
    </div>
  )
}
