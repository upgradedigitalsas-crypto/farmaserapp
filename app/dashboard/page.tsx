'use client'
import { useAuthStore } from '@/lib/store'
import { useEffect, useState, useMemo } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { CalendarDays, Users2, BarChart3, AlertCircle, Zap, Filter, CheckCircle2, Clock } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [doctors, setDoctors] = useState<any[]>([])
  const [plannedVisits, setPlannedVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedRep, setSelectedRep] = useState('Todos')

  const isAdmin = user?.email?.toLowerCase().trim() === 'entrenamientofarmaser@gmail.com'

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true)
      try {
        // 1. Cargar Médicos
        const resDocs = await fetch('/api/doctors')
        const dataDocs = await resDocs.json()
        setDoctors(Array.isArray(dataDocs) ? dataDocs : [])

        // 2. Cargar Visitas (Sin orderBy para evitar error de Firebase)
        const visitsRef = collection(db, 'planned_visits')
        let q;
        if (isAdmin && selectedRep === 'Todos') {
          q = query(visitsRef); 
        } else {
          const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase().trim();
          if(targetEmail){
             q = query(visitsRef, where('userEmail', '==', targetEmail));
          } else {
             q = query(visitsRef);
          }
        }

        const querySnapshot = await getDocs(q)
        let allVisits = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        
        // Ordenar en memoria
        allVisits.sort((a: any, b: any) => (a.visitDate || '').localeCompare(b.visitDate || ''))
        setPlannedVisits(allVisits)

      } catch (error) {
        console.error("Error cargando dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadDashboardData()
    }
  }, [user, selectedRep, isAdmin])

  const repsList = useMemo(() => {
    if (!isAdmin) return []
    const uniqueEmails = new Set(
      doctors
        .map((d: any) => String(d.assignedTo || '').toLowerCase().trim())
        .filter(email => email !== '')
    )
    return Array.from(uniqueEmails)
  }, [doctors, isAdmin])

  const myDocsCount = useMemo(() => {
    if (isAdmin) {
      if (selectedRep === 'Todos') {
        return doctors.length 
      } else {
        return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === selectedRep).length
      }
    } else {
      const email = user?.email?.toLowerCase().trim()
      return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === email).length
    }
  }, [doctors, user, isAdmin, selectedRep])

  // Lógicas de KPIs y Fechas
  const todayStr = new Date().toISOString().slice(0, 10)
  
  const monthVisits = useMemo(() => {
    return plannedVisits.filter(v => v.visitDate?.includes('-04-'))
  }, [plannedVisits])

  const todayVisits = useMemo(() => {
    return plannedVisits.filter(v => v.visitDate === todayStr)
  }, [plannedVisits, todayStr])

  const planeadasMes = monthVisits.length
  const realizadasMes = monthVisits.filter(v => v.status === 'Realizada').length
  const efectividad = planeadasMes > 0 ? Math.round((realizadasMes / planeadasMes) * 100) : 0

  if (loading) return <div className="ml-64 p-20 text-center font-black text-gray-300 animate-pulse">SINCRONIZANDO...</div>

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] mx-auto min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Panel de Control</h1>
          <p className="text-gray-500 text-sm font-medium">{user?.email} {isAdmin && ' (Modo Gerente)'}</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          
          {isAdmin && (
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 flex-1 md:flex-none">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <Filter size={20}/>
              </div>
              <div className="pr-3">
                <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Vista Activa</p>
                <select 
                  value={selectedRep} 
                  onChange={(e) => setSelectedRep(e.target.value)}
                  className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 cursor-pointer w-full appearance-none"
                >
                  <option value="Todos">Toda la Empresa (Global)</option>
                  {repsList.map((email) => (
                    <option key={email} value={email}>{email}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Zap size={20}/></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase leading-none">Visitas Hoy</p><p className="text-2xl font-black text-gray-900">{todayVisits.length}</p></div>
          </div>
        </div>
      </header>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-12">
        {[
          { label: 'Planeadas mes', val: planeadasMes, icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Cobertura', val: '0%', icon: Users2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Efectividad', val: `${efectividad}%`, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'No reportadas', val: planeadasMes - realizadasMes, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-5 rounded-[30px] border border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center shadow-sm">
            <div><p className="text-[9px] lg:text-[11px] font-bold text-gray-400 uppercase mb-1">{kpi.label}</p><p className="text-xl lg:text-3xl font-black text-gray-900">{kpi.val}</p></div>
            <div className={`mt-2 lg:mt-0 p-3 ${kpi.bg} ${kpi.color} rounded-2xl`}><kpi.icon size={20} /></div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm min-h-[300px]">
          <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter flex items-center gap-3">Agenda del día</h3>
          
          {todayVisits.length === 0 ? (
            <p className="text-gray-400 font-medium text-sm italic">No hay visitas planeadas para hoy.</p>
          ) : (
            <div className="space-y-4">
              {todayVisits.map((v, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm ${v.status === 'Realizada' ? 'bg-green-500' : 'bg-blue-600'}`}>
                      {v.status === 'Realizada' ? <CheckCircle2 size={24}/> : <Clock size={24}/>}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 uppercase">{v.doctorName}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{v.doctorDetails?.specialty || 'Especialista'} | {v.doctorDetails?.city || 'Ciudad'}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${v.status === 'Realizada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black mb-1 uppercase">Cartera</h3>
          <div className="text-center p-6 bg-blue-50 rounded-3xl border border-blue-100 my-6">
              <p className="text-6xl font-black text-blue-600 tracking-tighter">{myDocsCount}</p>
              <p className="text-xs text-gray-400 font-medium uppercase mt-1">Asignados</p>
          </div>
        </div>
      </div>
    </div>
  )
}
