'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { Search, MapPin, User, Star, Download, Navigation, Phone, Filter } from 'lucide-react'

export default function MedicalCentersPage() {
  const { user } = useAuthStore()
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // NUEVO: Estado para el filtro del Super Admin
  const [selectedRepFilter, setSelectedRepFilter] = useState('Todos')

  // NUEVO: Validación de Super Admin
  const isAdmin = user?.email?.toLowerCase().trim() === 'entrenamientofarmaser@gmail.com'

  useEffect(() => {
    fetch('/api/doctors').then(res => res.json()).then(data => {
      setDoctors(Array.isArray(data) ? data : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // NUEVO: Generar lista de visitadores solo para el Admin
  const repsList = useMemo(() => {
    if (!isAdmin) return []
    return Array.from(new Set(doctors.map((d: any) => String(d.assignedTo || '').toLowerCase().trim()).filter(e => e !== '' && !e.includes('#')))).sort()
  }, [doctors, isAdmin])

  // AJUSTE: Reemplaza "myDocs" para que se adapte al rol
  const baseDocs = useMemo(() => {
    if (!isAdmin) {
      // Visitador normal: Ve exactamente lo mismo que antes (su correo)
      const email = user?.email?.toLowerCase().trim()
      return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === email)
    } else {
      // Admin: Ve toda la empresa o filtra por el dropdown
      if (selectedRepFilter === 'Todos') return doctors
      return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === selectedRepFilter)
    }
  }, [doctors, user, isAdmin, selectedRepFilter])

  // AJUSTE: El buscador ahora usa baseDocs
  const filteredDocs = useMemo(() => {
    if (!searchTerm) return baseDocs
    const t = searchTerm.toLowerCase()
    return baseDocs.filter(d => d.name.toLowerCase().includes(t) || d.specialty.toLowerCase().includes(t))
  }, [baseDocs, searchTerm])

  // INTACTO: La función de exportar no se tocó
  const exportCSV = (dataToExport: any[], fileName: string) => {
    if (dataToExport.length === 0) return alert('No hay datos para exportar.');

    const headers = ['ID', 'Categoria', 'Nombre', 'Especialidad', 'Ciudad', 'Direccion', 'Telefono'];
    const rows = dataToExport.map(d => {
      return [
        d.id,
        d.category || 'N/A',
        `"${d.name || ''}"`,
        `"${d.specialty || ''}"`,
        `"${d.city || ''}"`,
        `"${d.address || 'Principal'}"`,
        `"${d.phone || ''}"` 
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

  if (loading) return <div className="p-20 text-center font-black text-gray-300 lg:ml-64">CARGANDO...</div>

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px] min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
            {isAdmin ? 'Directorio Maestro' : 'Mi Base Asignada'}
          </h1>
          <p className="text-gray-400 font-bold text-[10px] tracking-widest uppercase mt-2">Total en cartera: {baseDocs.length}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          
          {/* NUEVO: Dropdown de filtro solo visible para Super Admin */}
          {isAdmin && (
            <div className="bg-white border-2 border-indigo-100 p-2 rounded-xl flex items-center gap-2 w-full sm:w-auto mr-2">
              <Filter size={16} className="text-indigo-600 ml-2" />
              <select 
                value={selectedRepFilter} 
                onChange={(e) => setSelectedRepFilter(e.target.value)}
                className="text-[10px] font-black uppercase text-gray-700 bg-transparent outline-none cursor-pointer pr-4"
              >
                <option value="Todos">Toda La Empresa</option>
                {repsList.map((rep) => (
                  <option key={rep} value={rep}>{rep}</option>
                ))}
              </select>
            </div>
          )}

          <button 
            onClick={() => exportCSV(filteredDocs, 'Base_Filtrada.csv')} 
            className="w-full sm:w-auto bg-white border-2 border-gray-200 text-gray-600 text-[10px] font-black uppercase px-6 py-4 rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
          >
            <Download size={16} /> Exportar Filtro ({filteredDocs.length})
          </button>
          
          <button 
            onClick={() => exportCSV(baseDocs, isAdmin ? 'Directorio_Empresa.csv' : 'Directorio_Visitador.csv')} 
            className="w-full sm:w-auto bg-blue-600 text-white text-[10px] font-black uppercase px-6 py-4 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Download size={16} /> Exportar Toda La Base
          </button>
        </div>
      </header>
      
      <div className="relative mb-10">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input type="text" placeholder="Buscar por nombre o especialidad..." className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl py-5 pl-14 pr-6 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      
      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
           <div className="text-center p-10 text-gray-400 font-bold text-sm uppercase">No se encontraron resultados.</div>
        ) : (
          filteredDocs.map((doc, i) => (
            <div key={i} className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-start sm:items-center gap-5 flex-col sm:flex-row hover:border-blue-200 transition-colors">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 border shrink-0"><User size={26} /></div>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center gap-2 mb-1">
                  {doc.category && <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">CAT: {doc.category}</span>}
                  <p className="font-black text-gray-900 text-base truncate uppercase tracking-tighter">{doc.name}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Star size={12} className="text-blue-500" />
                    <span className="text-[11px] font-bold uppercase">{doc.specialty}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <MapPin size={12} />
                    <span className="text-[11px] font-bold uppercase">{doc.city}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Navigation size={12} />
                    <span className="text-[11px] font-bold uppercase">{doc.address}</span>
                  </div>
                  
                  {doc.phone && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Phone size={12} fill="currentColor" className="opacity-80" />
                      <span className="text-[11px] font-black uppercase">{doc.phone}</span>
                    </div>
                  )}

                  {/* NUEVO: Pequeña etiqueta visual para el Admin de a quién pertenece el médico */}
                  {isAdmin && selectedRepFilter === 'Todos' && doc.assignedTo && (
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