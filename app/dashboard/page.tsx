'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { CalendarDays, Users, BarChart3, AlertCircle, Zap, Filter } from 'lucide-react'

export default function DashboardPage() {
  const { user, selectedRep, setSelectedRep } = useAuthStore()
  
  const [doctors, setDoctors] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.email?.toLowerCase().trim() === 'entrenamientofarmaser@gmail.com'

  const repsList = useMemo(() => {
    if (!isAdmin) return []
    return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#'))))
  }, [doctors, isAdmin])

  useEffect(() => {
    const loadData = async () => {
      if (!user?.email) return
      setLoading(true)

      try {
        // 1. CARGAR BASE MÉDICA (CARTERA TOTAL)
        const docRes = await fetch('/api/doctors')
        const docData = await docRes.json()
        const allDoctors = Array.isArray(docData) ? docData : []
        setDoctors(allDoctors)

        // 2. DEFINIR FECHAS DEL MES ACTUAL
        const now = new Date()
        const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        const endOfMonthStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
        
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        const targetEmail = isAdmin ? selectedRep : user.email.toLowerCase().trim()

        // 3. CARGAR VISITAS PLANEADAS DEL MES
        const visitsRef = collection(db, 'planned_visits')
        let qVisits;
        if (isAdmin && selectedRep === 'Todos') {
          qVisits = query(visitsRef, where('visitDate', '>=', startOfMonthStr), where('visitDate', '<=', endOfMonthStr))
        } else {
          qVisits = query(visitsRef, where('userEmail', '==', targetEmail), where('visitDate', '>=', startOfMonthStr), where('visitDate', '<=', endOfMonthStr))
        }
        const vSnap = await getDocs(qVisits)
        setVisits(vSnap.docs.map(d => ({ id: d.id, ...d.data() })))

        // 4. CARGAR REPORTES DEL MES (Ejecutadas)
        const reportsRef = collection(db, 'visit_reports')
        const qReports = query(reportsRef, where('reportedAt', '>=', startDate), where('reportedAt', '<=', endDate))
        const rSnap = await getDocs(qReports)
        
        let allR = rSnap.docs.map(d => d.data())

        // Si NO es Admin, o si es Admin buscando a alguien específico, filtramos los reportes localmente
        if (!isAdmin || (isAdmin && selectedRep !== 'Todos')) {
           allR = allR.filter(r => String(r.userEmail || '').toLowerCase().trim() === targetEmail)
        }
        
        setReports(allR)

      } catch (e) {
        console.error('Error cargando dashboard:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user, selectedRep, isAdmin])

  // === CÁLCULOS DE KPIs MATEMÁTICOS ===
  const targetEmail = isAdmin ? selectedRep : user?.email?.toLowerCase().trim()
  
  // Cartera Total (Global vs Individual)
  const myBase = (isAdmin && selectedRep === 'Todos') 
    ? doctors 
    : doctors.filter(d => String(d.assignedTo || '').toLowerCase().trim() === targetEmail)
  
  const baseSize = myBase.length

  // Médicos Únicos Visitados en el mes (Suma global o esfuerzo individual)
  const uniqueVisited = new Set(reports.map(r => String(r.doctorName || '').toLowerCase().trim())).size

  // Fórmulas Finales
  const cobertura = baseSize > 0 ? ((uniqueVisited / baseSize) * 100).toFixed(1) : '0.0'
  const efectividad = visits.length > 0 ? ((reports.length / visits.length) * 100).toFixed(1) : '0.0'
  const noReportadas = Math.max(0, visits.length - reports.length)
  
  const todayStr = new Date().toISOString().slice(0, 10)
  const visitasHoy = visits.filter(v => v.visitDate === todayStr)

  if (loading) return <div className="p-20 text-center font-black text-gray-400 animate-pulse lg:ml-64">Sincronizando Métricas...</div>

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F8FAFC]">
      
      {/* HEADER */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">Panel de Control</h1>
          <p className="text-gray-500 font-medium text-sm mt-2">{user?.email} {isAdmin && '(Modo Gerente)'}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
          {isAdmin && (
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><Filter size={20}/></div>
              <div className="pr-3">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Vista Activa</p>
                <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer appearance-none">
                  <option value="Todos">Toda la Empresa (Global)</option>
                  {repsList.map((email) => <option key={email} value={email}>{email}</option>)}
                </select>
              </div>
            </div>
          )}
          
          <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center gap-4 min-w-[160px]">
            <div className="bg-white/20 p-2 rounded-xl"><Zap size={20} /></div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-80 mb-0.5">Visitas Hoy</p>
              <p className="text-2xl font-black leading-none">{visitasHoy.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* KPIs CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Planeadas Mes</p>
            <p className="text-3xl font-black text-gray-900">{visits.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><CalendarDays size={24}/></div>
        </div>

        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-center justify-between group hover:border-green-200 transition-colors">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cobertura</p>
            <p className="text-3xl font-black text-gray-900">{cobertura}%</p>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Users size={24}/></div>
        </div>

        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-center justify-between group hover:border-purple-200 transition-colors">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Efectividad</p>
            <p className="text-3xl font-black text-gray-900">{efectividad}%</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><BarChart3 size={24}/></div>
        </div>

        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-center justify-between group hover:border-orange-200 transition-colors">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">No Reportadas</p>
            <p className="text-3xl font-black text-gray-900">{noReportadas}</p>
          </div>
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><AlertCircle size={24}/></div>
        </div>
      </div>

      {/* MAIN PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
          <h2 className="text-lg font-black uppercase text-gray-900 mb-6 tracking-tighter">Agenda del Día</h2>
          {visitasHoy.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-400 font-medium italic text-sm">No hay visitas planeadas para hoy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visitasHoy.map((v: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center border border-gray-100">
                  <div>
                    <p className="font-black text-gray-900 uppercase text-sm">{v.doctorName}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{v.doctorDetails?.city || 'Sin ciudad'} • {v.doctorDetails?.specialty || 'General'}</p>
                  </div>
                  <span className="text-xs font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">{v.startTime || '--:--'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
          <h2 className="text-lg font-black uppercase text-gray-900 mb-8 tracking-tighter w-full text-left">Cartera</h2>
          <div className="bg-blue-50 w-full py-12 rounded-[30px] border border-blue-100">
            <p className="text-6xl font-black text-blue-600 tracking-tighter mb-2">{baseSize}</p>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Asignados</p>
          </div>
        </div>

      </div>

    </div>
  )
}
