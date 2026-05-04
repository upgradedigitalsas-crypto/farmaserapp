'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore, TEAM_MAPPING } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { 
  CalendarDays, Users, BarChart3, AlertCircle, Zap, Filter, 
  CheckCircle, Star, X, Activity, Briefcase
} from 'lucide-react'

export default function DashboardPage() {
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  
  const [doctors, setDoctors] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [lastMonthStats, setLastMonthStats] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(true)

  const userEmail = user?.email?.toLowerCase().trim() || ''
  const isAdmin = user?.role === 'admin' || userEmail === 'entrenamientofarmaser@gmail.com'
  const isManager = user?.role === 'manager' || Object.keys(TEAM_MAPPING).includes(userEmail)

  const repsList = useMemo(() => {
    if (isAdmin) {
      return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#')))).sort()
    } else if (isManager) {
      const myTeam = TEAM_MAPPING[userEmail] || []
      return myTeam.filter(email => email !== userEmail).sort()
    }
    return []
  }, [doctors, isAdmin, isManager, userEmail])

  useEffect(() => {
    const loadData = async () => {
      if (!userEmail) return
      setLoading(true)

      try {
        const docRes = await fetch('/api/doctors')
        const docData = await docRes.json()
        const allDoctors = Array.isArray(docData) ? docData : []
        setDoctors(allDoctors)

        const now = new Date()
        const targetEmail = (isAdmin || isManager) && selectedRep !== 'Todos' ? selectedRep : userEmail
        
        const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        const endOfMonthStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lmStartStr = lastMonthDate.toISOString().slice(0, 10)
        const lmEndStr = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
        const lmStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lmEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        const lmName = lastMonthDate.toLocaleString('es-ES', { month: 'long' })

        const visitsRef = collection(db, 'planned_visits')
        const reportsRef = collection(db, 'visit_reports')

        let finalVisits: any[] = []
        let finalReports: any[] = []

        if ((isAdmin || isManager) && selectedRep === 'Todos') {
          const qVisits = query(visitsRef, where('visitDate', '>=', startOfMonthStr), where('visitDate', '<=', endOfMonthStr))
          const vSnap = await getDocs(qVisits)
          let tempVisits = vSnap.docs.map(d => ({ id: d.id, ...d.data() }))

          const qReports = query(reportsRef, where('reportedAt', '>=', startDate), where('reportedAt', '<=', endDate))
          const rSnap = await getDocs(qReports)
          let tempReports = rSnap.docs.map(d => d.data())

          if (isManager) {
            const myTeam = TEAM_MAPPING[userEmail] || []
            finalVisits = tempVisits.filter((v: any) => myTeam.includes(String(v.userEmail || '').toLowerCase().trim()))
            finalReports = tempReports.filter((r: any) => myTeam.includes(String(r.userEmail || '').toLowerCase().trim()))
          } else {
            finalVisits = tempVisits
            finalReports = tempReports
          }
          setLastMonthStats(null)

        } else {
          const qVisits = query(visitsRef, where('userEmail', '==', targetEmail))
          const vSnap = await getDocs(qVisits)
          finalVisits = vSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((v: any) => v.visitDate >= startOfMonthStr && v.visitDate <= endOfMonthStr)

          const qReports = query(reportsRef, where('userEmail', '==', targetEmail))
          const rSnap = await getDocs(qReports)
          finalReports = rSnap.docs.map(d => d.data()).filter((r: any) => {
            const rDate = r.reportedAt?.toDate ? r.reportedAt.toDate() : new Date(r.reportedAt)
            return rDate >= startDate && rDate <= endDate
          })

          const lmVisits = vSnap.docs.map(d => d.data()).filter((v: any) => v.visitDate >= lmStartStr && v.visitDate <= lmEndStr)
          const lmReports = rSnap.docs.map(d => d.data()).filter((r: any) => {
            const rDate = r.reportedAt?.toDate ? r.reportedAt.toDate() : new Date(r.reportedAt)
            return rDate >= lmStartDate && rDate <= lmEndDate
          })

          const myBase = allDoctors.filter(d => String(d.assignedTo || '').toLowerCase().trim() === targetEmail)
          const uniqueVisited = new Set(lmReports.map(r => String(r.doctorName || '').toLowerCase().trim())).size
          
          setLastMonthStats({
            name: lmName,
            planeadas: lmVisits.length,
            reportadas: lmReports.length,
            efectividad: lmVisits.length > 0 ? ((lmReports.length / lmVisits.length) * 100).toFixed(1) : '0',
            cobertura: myBase.length > 0 ? ((uniqueVisited / myBase.length) * 100).toFixed(1) : '0',
            pendientes: Math.max(0, lmVisits.length - lmReports.length)
          })
        }

        setVisits(finalVisits)
        setReports(finalReports)

      } catch (e) {
        console.error('Error cargando dashboard:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [userEmail, selectedRep, isAdmin, isManager])

  const targetEmail = (isAdmin || isManager) && selectedRep !== 'Todos' ? selectedRep : userEmail
  
  const myBase = useMemo(() => {
    if (isAdmin && selectedRep === 'Todos') return doctors;
    if (isManager && selectedRep === 'Todos') {
       const myTeam = TEAM_MAPPING[userEmail] || [];
       return doctors.filter(d => myTeam.includes(String(d.assignedTo || '').toLowerCase().trim()));
    }
    return doctors.filter(d => String(d.assignedTo || '').toLowerCase().trim() === targetEmail);
  }, [doctors, isAdmin, isManager, selectedRep, userEmail, targetEmail])

  const baseSize = myBase.length
  const uniqueVisited = new Set(reports.map(r => String(r.doctorName || '').toLowerCase().trim())).size
  const cobertura = baseSize > 0 ? ((uniqueVisited / baseSize) * 100).toFixed(1) : '0.0'
  const efectividad = visits.length > 0 ? ((reports.length / visits.length) * 100).toFixed(1) : '0.0'
  const noReportadas = Math.max(0, visits.length - reports.length)
  const todayStr = new Date().toISOString().slice(0, 10)
  const visitasHoy = visits.filter(v => v.visitDate === todayStr)

  if (loading) return <div className="p-20 text-center font-black text-gray-400 animate-pulse lg:ml-64">Sincronizando Métricas...</div>

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F8FAFC]">
      
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">Panel de Control</h1>
          <p className="text-gray-500 font-medium text-sm mt-2">{user?.email} {isAdmin ? '(Super Admin)' : isManager ? '(Modo Gerente)' : ''}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
          {(isAdmin || isManager) && (
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><Filter size={20}/></div>
              <div className="pr-3">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Vista Activa</p>
                <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer appearance-none pr-4">
                  {isAdmin ? (
                    <option value="Todos">Toda la Empresa (Global)</option>
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
          <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center gap-4 min-w-[160px] w-full sm:w-auto">
            <div className="bg-white/20 p-2 rounded-xl"><Zap size={20} /></div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-80 mb-0.5">Visitas Hoy</p>
              <p className="text-2xl font-black leading-none">{visitasHoy.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* --- BANNER DE CONTROL MULTI-ROL --- */}
      
      {/* 1. BANNER PARA SUPER ADMIN */}
      {isAdmin && selectedRep === 'Todos' ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 rounded-[40px] p-8 md:p-12 shadow-2xl mb-10 border border-white/10 group">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-indigo-500/20 backdrop-blur-xl rounded-3xl flex items-center justify-center text-indigo-300 shadow-inner border border-indigo-500/30 group-hover:scale-110 transition-transform duration-500">
                <Activity size={40} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-white text-3xl md:text-4xl font-black uppercase tracking-tighter italic leading-none">
                  Estado Global <span className="text-indigo-400">Farmaser</span>
                </h2>
                <p className="text-indigo-100/80 font-medium text-sm md:text-lg mt-2 max-w-xl">
                  Se coordinan <span className="font-black text-white">{visits.length}</span> citas totales este mes, con efectividad global del <span className="font-black text-indigo-300">{efectividad}%</span>.
                </p>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[30px] flex flex-col items-center justify-center min-w-[200px]">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">Pendientes Globales</p>
              <span className="text-4xl font-black text-white">{noReportadas}</span>
              <p className="text-[9px] font-bold text-red-400 uppercase mt-2 animate-bounce">Revisión Requerida</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-20 -mt-20" />
        </div>
      ) 
      
      /* 2. BANNER PARA GERENTE (CONSOLIDADO EQUIPO) */
      : isManager && selectedRep === 'Todos' ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 rounded-[40px] p-8 md:p-12 shadow-2xl mb-10 border border-white/10 group">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-purple-500/20 backdrop-blur-xl rounded-3xl flex items-center justify-center text-purple-300 border border-purple-500/30 group-hover:rotate-12 transition-transform duration-500">
                <Briefcase size={40} />
              </div>
              <div>
                <h2 className="text-white text-3xl md:text-4xl font-black uppercase tracking-tighter italic leading-none">
                  Gestión de <span className="text-purple-400">Equipo</span>
                </h2>
                <p className="text-purple-100/80 font-medium text-sm md:text-lg mt-2 max-w-xl">
                  Tu equipo ha planeado <span className="font-black text-white">{visits.length} visitas</span>. La efectividad grupal actual es del <span className="font-black text-purple-300">{efectividad}%</span>.
                </p>
              </div>
            </div>
            <div className="bg-purple-500/10 backdrop-blur-md border border-purple-400/20 p-6 rounded-[30px] flex flex-col items-center justify-center min-w-[200px]">
              <p className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em] mb-1">Sin Reportar en Equipo</p>
              <span className="text-4xl font-black text-white">{noReportadas}</span>
              <p className="text-[9px] font-bold text-orange-400 uppercase mt-2">Seguimiento Sugerido</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] -mr-20 -mt-20" />
        </div>
      )

      /* 3. BANNER INDIVIDUAL (PARA VISITADORES O CUANDO SE FILTRA A ALGUIEN) */
      : lastMonthStats && showBanner ? (
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 rounded-[35px] p-6 mb-10 shadow-xl shadow-blue-100 border border-blue-400/20">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="bg-white/10 p-4 rounded-[24px] backdrop-blur-md border border-white/20">
              <Star className="text-yellow-300 w-8 h-8" fill="currentColor" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-white font-black uppercase italic tracking-tighter text-xl leading-none">
                {selectedRep !== userEmail && selectedRep !== 'Todos' ? `Desempeño de ${selectedRep.split('@')[0]} en` : 'Tu desempeño en'} <span className="text-yellow-300">{lastMonthStats.name}</span>
              </h3>
              <p className="text-blue-50 text-sm mt-2 font-medium leading-relaxed max-w-2xl">
                Logró <span className="font-black text-white">{lastMonthStats.planeadas} citas planeadas</span> con una efectividad de reporte del <span className="font-black text-white">{lastMonthStats.efectividad}%</span> y una cobertura del <span className="font-black text-white">{lastMonthStats.cobertura}%</span>.
              </p>
              {lastMonthStats.pendientes > 0 && (
                <div className="inline-flex items-center gap-2 mt-4 bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-400/30">
                  <AlertCircle size={14} className="text-red-200" />
                  <p className="text-[10px] font-black text-red-100 uppercase tracking-widest">
                    Ojo: {lastMonthStats.pendientes} visitas quedaron pendientes de reporte.
                  </p>
                </div>
              )}
            </div>
            <button onClick={() => setShowBanner(false)} className="absolute top-0 right-0 p-2 text-white/50 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
      ) : null}

      {/* --- TARJETAS DE INDICADORES (IGUALES QUE ANTES) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-blue-200 transition-colors">
          <div className="flex items-start justify-between w-full">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Planeadas</p>
              <p className="text-3xl font-black text-gray-900">{visits.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><CalendarDays size={24}/></div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 w-full">
            <p className="text-[9px] font-bold text-gray-400 uppercase leading-tight"><span className="text-blue-500">Total:</span> Agendadas este mes</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-indigo-200 transition-colors">
          <div className="flex items-start justify-between w-full">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Reportadas</p>
              <p className="text-3xl font-black text-gray-900">{reports.length}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><CheckCircle size={24}/></div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 w-full">
            <p className="text-[9px] font-bold text-gray-400 uppercase leading-tight"><span className="text-indigo-500">Total:</span> Ejecutadas y validadas</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-green-200 transition-colors">
          <div className="flex items-start justify-between w-full">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cobertura</p>
              <p className="text-3xl font-black text-gray-900">{cobertura}%</p>
            </div>
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Users size={24}/></div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 w-full">
            <p className="text-[9px] font-bold text-gray-400 uppercase leading-tight"><span className="text-green-500">Fórmula:</span> (Visitados ÷ Base) × 100</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-purple-200 transition-colors">
          <div className="flex items-start justify-between w-full">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Efectividad</p>
              <p className="text-3xl font-black text-gray-900">{efectividad}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><BarChart3 size={24}/></div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 w-full">
            <p className="text-[9px] font-bold text-gray-400 uppercase leading-tight"><span className="text-purple-500">Fórmula:</span> (Reportadas ÷ Planeadas) × 100</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-orange-200 transition-colors">
          <div className="flex items-start justify-between w-full">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pte Reporte</p>
              <p className="text-3xl font-black text-gray-900">{noReportadas}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><AlertCircle size={24}/></div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 w-full">
            <p className="text-[9px] font-bold text-gray-400 uppercase leading-tight"><span className="text-orange-500">Alerta:</span> Planeadas sin reporte</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
          <h2 className="text-lg font-black uppercase text-gray-900 mb-6 tracking-tighter">Agenda del Día</h2>
          {visitasHoy.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-400 font-medium italic text-sm">No hay visitas planeadas para hoy.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {visitasHoy.map((v: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center border border-gray-100">
                  <div>
                    <p className="font-black text-gray-900 uppercase text-sm leading-tight">{v.doctorName}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{v.doctorDetails?.city || 'Sin ciudad'} • {v.doctorDetails?.specialty || 'General'}</p>
                    {(isAdmin || isManager) && selectedRep === 'Todos' && (
                       <p className="text-[9px] font-black text-indigo-500 mt-1 truncate">{v.userEmail}</p>
                    )}
                  </div>
                  <span className="text-xs font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-lg shrink-0 ml-3">{v.startTime || '--:--'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
          <h2 className="text-lg font-black uppercase text-gray-900 mb-8 tracking-tighter w-full text-left">Cartera</h2>
          <div className="bg-blue-50 w-full py-12 rounded-[30px] border border-blue-100 hover:scale-105 transition-transform">
            <p className="text-6xl font-black text-blue-600 tracking-tighter mb-2">{baseSize}</p>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
               {selectedRep === 'Todos' ? 'Médicos Totales (Global)' : 'Médicos Asignados'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}