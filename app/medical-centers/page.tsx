'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore, TEAM_MAPPING } from '@/lib/store' 
import { Search, MapPin, User, Star, Download, Navigation, Phone, Filter, Mail } from 'lucide-react'

export default function MedicalCentersPage() {
  const { user } = useAuthStore()
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRepFilter, setSelectedRepFilter] = useState('Todos')

  const userEmail = user?.email?.toLowerCase().trim() || ''
  // BLINDAJE CACHÉ: Evaluamos el rol, pero respaldamos con el correo por si tienen una sesión antigua activa.
  const isAdmin = user?.role === 'admin' || userEmail === 'entrenamientofarmaser@gmail.com'
  const isManager = user?.role === 'manager' || Object.keys(TEAM_MAPPING).includes(userEmail)

  useEffect(() => {
    fetch('/api/doctors')
      .then(res => res.json())
      .then(data => {
        setDoctors(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filterOptions = useMemo(() => {
    if (isAdmin) {
      return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#')))).sort()
    } else if (isManager) {
      const myTeam = TEAM_MAPPING[userEmail] || []
      return myTeam.filter(email => email !== userEmail).sort() 
    }
    return []
  }, [doctors, isAdmin, isManager, userEmail])

  const baseDocs = useMemo(() => {
    if (isAdmin) {
      if (selectedRepFilter === 'Todos') return doctors
      return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === selectedRepFilter)
    } 
    
    if (isManager) {
      const myTeam = TEAM_MAPPING[userEmail] || []
      if (selectedRepFilter === 'Todos') {
        return doctors.filter((d: any) => myTeam.includes(String(d.assignedTo || '').toLowerCase().trim()))
      } else if (selectedRepFilter === 'Mi Gestion') {
        return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === userEmail)
      } else {
        return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === selectedRepFilter)
      }
    }

    return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === userEmail)
    
  }, [doctors, isAdmin, isManager, userEmail, selectedRepFilter])

  const filteredDocs = useMemo(() => {
    if (!searchTerm) return baseDocs
    const t = searchTerm.toLowerCase()
    return baseDocs.filter(d => d.name.toLowerCase().includes(t) || d.specialty.toLowerCase().includes(t))
  }, [baseDocs, searchTerm])

  const exportCSV = (dataToExport: any[], fileName: string) => {
    if (dataToExport.length === 0) return alert('No hay datos para exportar.');

    const headers = ['Categoria', 'Nombre', 'Correo', 'Especialidad', 'Ciudad', 'Direccion', 'Telefono', 'Visitador Asignado'];
    const rows = dataToExport.map(d => {
      return [
        d.category || 'N/A',
        `"${d.name || ''}"`,
        `"${d.email || ''}"`,
        `"${d.specialty || ''}"`,
        `"${d.city || ''}"`,
        `"${d.address || ''}"`,
        `"${d.phone || ''}"`,
        `"${d.assignedTo || ''}"`,
      ].join(',');
    });
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 lg:ml-64">
      <p className="text-sm text-gray-400 animate-pulse font-medium">Cargando directorio...</p>
    </div>
  )

  return (
    <div className="p-4 pt-20 lg:p-10 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F5F5F7]">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {isAdmin ? 'Directorio Maestro' : isManager ? 'Directorio de Equipo' : 'Mi Base Asignada'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            <span className="font-semibold text-gray-600">{baseDocs.length}</span> médicos en cartera
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          
          {(isAdmin || isManager) && (
            <div className="bg-white border border-black/[0.07] p-2 rounded-xl flex items-center gap-2 w-full sm:w-auto shadow-sm">
              <Filter size={15} className="text-indigo-500 ml-2 shrink-0" />
              <select
                value={selectedRepFilter}
                onChange={(e) => setSelectedRepFilter(e.target.value)}
                className="text-xs font-semibold text-gray-700 bg-transparent outline-none cursor-pointer pr-4"
              >
                {isAdmin ? (
                  <option value="Todos">Toda La Empresa</option>
                ) : (
                  <>
                    <option value="Todos">Consolidado Equipo</option>
                    <option value="Mi Gestion">Mi Gestión Propia</option>
                  </>
                )}
                {filterOptions.map((rep) => (
                  <option key={rep} value={rep}>{rep}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => exportCSV(filteredDocs, 'Base_Filtrada.csv')}
            className="w-full sm:w-auto bg-white border border-black/[0.07] text-gray-600 text-xs font-semibold px-5 py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            <Download size={14} /> Filtro ({filteredDocs.length})
          </button>

          <button
            onClick={() => exportCSV(baseDocs, isAdmin ? 'Directorio_Empresa.csv' : isManager ? 'Directorio_Equipo.csv' : 'Directorio_Visitador.csv')}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Download size={14} /> Exportar Base
          </button>
        </div>
      </header>
      
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar por nombre o especialidad..."
          className="w-full bg-white border border-black/[0.07] shadow-sm rounded-2xl py-3.5 pl-11 pr-5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-300"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-2.5">
        {filteredDocs.length === 0 ? (
          <div className="text-center p-10 text-sm text-gray-400">No se encontraron resultados.</div>
        ) : (
          filteredDocs.map((doc, i) => (
            <div key={i} className="bg-white px-5 py-4 rounded-2xl shadow-sm border border-black/[0.05] flex items-center gap-4 flex-col sm:flex-row hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0"><User size={20} /></div>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center gap-2 mb-1">
                  {doc.category && <span className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-lg">Cat. {doc.category}</span>}
                  <p className="font-semibold text-gray-900 text-sm truncate">{doc.name}</p>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Star size={11} className="text-blue-400" />
                    <span className="text-xs">{doc.specialty}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <MapPin size={11} />
                    <span className="text-xs">{doc.city}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Navigation size={11} />
                    <span className="text-xs truncate max-w-[180px]">{doc.address}</span>
                  </div>
                  
                  {doc.phone && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Phone size={12} fill="currentColor" className="opacity-80" />
                      <span className="text-[11px] font-black uppercase">{doc.phone}</span>
                    </div>
                  )}

                  {doc.email && (
                    <div className="flex items-center gap-1 text-blue-500">
                      <Mail size={11} />
                      <span className="text-[11px] font-medium">{doc.email}</span>
                    </div>
                  )}

                  {(isAdmin || isManager) && (selectedRepFilter === 'Todos') && doc.assignedTo && (
                    <div className="flex items-center gap-1 text-indigo-400 border-l pl-4 ml-2">
                      <User size={12} />
                      <span className="text-[10px] font-black uppercase italic">{doc.assignedTo}</span>
                    </div>
                  )}

                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
         