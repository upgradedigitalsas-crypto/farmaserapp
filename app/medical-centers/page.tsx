'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { Search, MapPin, User, Star, Download } from 'lucide-react'

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
    let csvContent = "data:text/csv;charset=utf-8,ID,Nombre,Especialidad,Ciudad\n";
    filteredDocs.forEach(d => { csvContent += `${d.id},"${d.name}","${d.specialty}","${d.city}"\n` });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "base_asignada.csv");
    document.body.appendChild(link);
    link.click();
  }

  if (loading) return <div className="ml-64 p-20 text-center font-black text-gray-300">CARGANDO...</div>

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1600px]   min-h-screen bg-[#F8FAFC]">
      <header className="flex justify-between items-center mb-10">
        <div><h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Mi Base Asignada</h1></div>
        <button onClick={exportCSV} className="bg-blue-600 text-white text-[10px] font-black uppercase px-6 py-4 rounded-xl shadow-lg flex items-center gap-2"><Download size={16} /> Exportar CSV</button>
      </header>
      <div className="relative mb-10">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input type="text" placeholder="Buscar..." className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl py-5 pl-14 pr-6 text-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div className="space-y-4">
        {filteredDocs.map((doc, i) => (
          <div key={i} className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-center gap-5">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 border"><User size={26} /></div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-base truncate uppercase">{doc.name}</p>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold uppercase mt-1">
                <Star size={12} className="text-blue-500" /><span>{doc.specialty}</span>
                <span className="opacity-30">•</span><MapPin size={12} /><span>{doc.city}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
