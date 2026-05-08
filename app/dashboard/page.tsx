'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore, TEAM_MAPPING } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { 
  CalendarDays, Users, BarChart3, AlertCircle, Zap, Filter, 
  CheckCircle, Star, X, Activity, Briefcase, Clock
} from 'lucide-react'

export default function DashboardPage() {
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  
  const [doctors, setDoctors] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [lastMonthStats, setLastMonthStats] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(true)

  // Lógica de Fechas para el mensaje
  const now = new Date()
  const currentMonthName = now.toLocaleString('es-ES', { month: 'long' })
  const currentDay = now.getDate()

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

  if (loading) return (
    <div className="flex items-center justify-center h-64 lg:ml-64">
      <p className="text-sm text-gray-400 animate-pulse font-medium">Sincronizando métricas...</p>
    </div>
  )

  return (
    <div className="p-4 pt-20 lg:p-10 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F5F5F7]">

      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Panel de Control</h1>
          <p className="text-gray-500 text-sm mt-1">{user?.email}{isAdmin ? ' · Super Admin' : isManager ? ' · Gerente' : ''}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
          {(isAdmin || isManager) && (
            <div className="bg-white px-3 py-2.5 rounded-2xl shadow-sm border border-black/[0.06] flex items-center gap-2.5 w-full sm:w-auto">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 shrink-0"><Filter size={16}/></div>
              <div className="pr-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Vista activa</p>
                <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none cursor-pointer appearance-none pr-4">
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
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-lg shadow-blue-600/25 flex items-center gap-3.5 min-w-[150px] w-full sm:w-auto">
            <div className="bg-white/20 p-2 rounded-xl shrink-0"><Zap size={18} /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase opacity-80 tracking-wide mb-0.5">Visitas hoy</p>
              <p className="text-2xl font-bold leading-none">{visitasHoy.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* --- BANNER GLOBAL MEJORADO (TIEMPO REAL) --- */}
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
                <p className="text-indigo-100/80 font-medium text-sm md:text-lg mt-3 max-w-2xl leading-relaxed">
                  Al día de hoy, <span className="text-white font-black underline decoration-indigo-500 underline-offset-4">{currentDay} de {currentMonthName}</span>, el laboratorio registra un acumulado de <span className="font-black text-white">{visits.length} citas planeadas</span>. La efectividad de reporte en tiempo real se sitúa en el <span className="font-black text-indigo-300">{efectividad}%</span>.
                </p>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[30px] flex flex-col items-center justify-center min-w-[220px]">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-indigo-400" />
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Citas sin Reporte ({currentMonthName})</p>
              </div>
              <span className="text-4xl font-black text-white">{noReportadas}</span>
              <p className="text-[9px] font-bold text-red-400 uppercase mt-2 animate-bounce">Revisión Requerida</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-20 -mt-20" />
        </div>
      ) 
      
      : isManager && selectedRep === 'Todos' ? (
        /* BANNER GERENTE (EQUIPO) */
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
                <p className="text-purple-100/80 font-medium text-sm md:text-lg mt-3 max-w-2xl leading-relaxed">
                  En el transcurso de <span className="text-white font-black uppercase">{currentMonthName}</span>, tu equipo ha agendado <span className="font-black text-white">{visits.length} visitas</span>. El cumplimiento operativo grupal alcanza el <span className="font-black text-purple-300">{efectividad}%</span> hasta la fecha.
                </p>
              </div>
            </div>
            <div className="bg-purple-500/10 backdrop-blur-md border border-purple-400/20 p-6 rounded-[30px] flex flex-col items-center justify-center min-w-[200px]">
              <p className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em] mb-1">Pendientes Equipo ({currentMonthName})</p>
              <span className="text-4xl font-black text-white">{noReportadas}</span>
              <p className="text-[9px] font-bold text-orange-400 uppercase mt-2">Seguimiento Sugerido</p>
            </div>
          </div>
        </div>
      )

      : lastMonthStats && showBanner ? (
        /* BANNER VISITADOR / FILTRADO (LOGROS MES ANTERIOR) */
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
                Durante el cierre de <span className="font-black text-white uppercase">{lastMonthStats.name}</span>, se consolidaron {lastMonthStats.planeadas} citas con una efectividad de reporte del {lastMonthStats.efectividad}% y una cobertura del {lastMonthStats.cobertura}%.
              </p>
              {lastMonthStats.pendientes > 0 && (
                <div className="inline-flex items-center gap-2 mt-4 bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-400/30">
                  <AlertCircle size={14} className="text-red-200" />
                  <p className="text-[10px] font-black text-red-100 uppercase tracking-widest">
                    Nota: {lastMonthStats.pendientes} visitas de {lastMonthStats.name} sin reporte final.
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

      {/* --- TARJETAS KPI --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">

        {/* Planeadas */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden group hover:shadow-md transition-shadow">
          <div className="h-1 bg-blue-500 rounded-t-2xl" />
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Planeadas</p>
                <p className="text-3xl font-bold text-gray-900">{visits.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <CalendarDays size={20}/>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-50">
              Acumulado <span className="font-semibold text-gray-600">{currentMonthName}</span>
            </p>
          </div>
        </div>

        {/* Reportadas */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden group hover:shadow-md transition-shadow">
          <div className="h-1 bg-indigo-500 rounded-t-2xl" />
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Reportadas</p>
                <p className="text-3xl font-bold text-gray-900">{reports.length}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <CheckCircle size={20}/>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-50">
              Validadas en <span className="font-semibold text-gray-600">plataforma</span>
            </p>
          </div>
        </div>

        {/* Cobertura */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden group hover:shadow-md transition-shadow">
          <div className="h-1 bg-emerald-500 rounded-t-2xl" />
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cobertura</p>
                <p className="text-3xl font-bold text-gray-900">{cobertura}%</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Users size={20}/>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-50">
              Penetración de <span className="font-semibold text-gray-600">cartera</span>
            </p>
          </div>
        </div>

        {/* Efectividad */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden group hover:shadow-md transition-shadow">
          <div className="h-1 bg-violet-500 rounded-t-2xl" />
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Efectividad</p>
                <p className="text-3xl font-bold text-gray-900">{efectividad}%</p>
              </div>
              <div className="w-10 h-10 bg-violet-50 text-violet-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <BarChart3 size={20}/>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-50">
              Gestión vs <span className="font-semibold text-gray-600">programación</span>
            </p>
          </div>
        </div>

        {/* Pendiente */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden group hover:shadow-md transition-shadow">
          <div className="h-1 bg-amber-500 rounded-t-2xl" />
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pte. Reporte</p>
                <p className="text-3xl font-bold text-gray-900">{noReportadas}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <AlertCircle size={20}/>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-50">
              Sin <span className="font-semibold text-gray-600">documentar</span>
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Agenda del día */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-black/[0.06] p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold text-gray-900">Agenda del Día</h2>
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
              {currentDay} {currentMonthName}
            </span>
          </div>
          {visitasHoy.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">No hay visitas planeadas para hoy.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {visitasHoy.map((v: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 p-3.5 bg-gray-50/80 rounded-xl border border-black/[0.04] hover:bg-gray-100/60 transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{v.doctorName}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {v.doctorDetails?.city || 'Sin ciudad'} · {v.doctorDetails?.specialty || 'General'}
                    </p>
                    {(isAdmin || isManager) && selectedRep === 'Todos' && (
                      <p className="text-[10px] text-indigo-500 font-medium mt-0.5 truncate">{v.userEmail}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-lg shrink-0">
                    {v.startTime || '--:--'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cartera */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] p-6 flex flex-col">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Cartera Global</h2>
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/80 py-10 hover:shadow-inner transition-all">
            <p className="text-5xl font-bold text-blue-600 tracking-tight mb-1">{baseSize}</p>
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
              {selectedRep === 'Todos' ? 'Médicos totales' : 'Médicos asignados'}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}