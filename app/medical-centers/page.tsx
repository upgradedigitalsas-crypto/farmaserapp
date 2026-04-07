'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { Search, MapPin, User, Star, Download, Navigation } from 'lucide-react'

export default function MedicalCentersPage() {
  const { user } = useAuthStore()
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetch('/api/doctors').then(res => res.json()).then(data => {
      setDoctors(Array.isArray(data) ? data : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const myDocs = useMemo(() => {
    const email = user?.email?.toLowerCase().trim()
    return doctors.filter((d: any) => String(d.assignedTo || '').toLowerCase().trim() === email)
  }, [doctors, user])

  const filteredDocs = useMemo(() => {
    return myDocs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [myDocs, searchTerm])

  const exportCSV = () => {
    // Añadimos BOM para que Excel lea las tildes, y agregamos columnas de Categoría y Dirección
    const headers = ['ID', 'Categoria', 'Nombre', 'Especialidad', 'Ciudad', 'Direccion'];
    const rows = filteredDocs.map(d => {
      return [
        d.id,
        d.category || 'N/A',
        `"${d.name || ''}"`,
        `"${d.specialty || ''}"`,
        `"${d.city || ''}"`,
        `"${d.address || 'Principal'}"`
      ].join(',');
    });
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "base_asignada_completa.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) return <div className="ml-64 p-20 text-center font-black text-gray-300">CARGANDO...</div>

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px]   min-h-screen bg-[#F8FAFC]">
      <header className="flex justify-between items-center mb-10">
        <div><h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Mi Base Asignada</h1></div>
        <button onClick={exportCSV} className="bg-blue-600 text-white text-[10px] font-black uppercase px-6 py-4 rounded-xl shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"><Download size={16} /> Exportar Base</button>
      </header>
      
      <div className="relative mb-10">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input type="text" placeholder="Buscar por nombre o especialidad..." className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl py-5 pl-14 pr-6 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      
      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
           <div className="text-center p-10 text-gray-400 font-bold text-sm uppercase">No se encontraron resultados en tu cartera.</div>
        ) : (
          filteredDocs.map((doc, i) => (
            <div key={i} className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-start sm:items-center gap-5 flex-col sm:flex-row hover:border-blue-200 transition-colors">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 border shrink-0"><User size={26} /></div>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center gap-2 mb-1">
                  {doc.category && <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">CAT: {doc.category}</span>}
                  <p className="font-black text-gray-900 text-base truncate uppercase">{doc.name}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase mt-1">
                  <span className="flex items-center gap-1"><Star size={12} className="text-blue-500" /> {doc.specialty}</span>
                  <span className="opacity-30">•</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {doc.city}</span>
                  
                  {doc.address && (
                    <>
                      <span className="opacity-30">•</span>
                      <span className="flex items-center gap-1 text-gray-400 truncate max-w-full sm:max-w-[200px] md:max-w-[300px]" title={doc.address}>
                        <Navigation size={12} /> {doc.address}
                      </span>
                    </>
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
