'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp, orderBy } from 'firebase/firestore'
import { User, MapPin, Plus, Minus, CheckCircle, Loader2, X, MessageSquare, Package, AlertCircle, Filter, Download, Briefcase, History } from 'lucide-react'

// ... (getFingerprintLocation y normalizeStr se mantienen igual)

export default function ReportsPage() {
  // ... (Estados y useEffects se mantienen igual hasta el renderizado del historial)

  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1400px] min-h-screen bg-[#F8FAFC]">
      {/* ... (Header e Admin View se mantienen igual) */}

      {!isAdmin && (
        <div className="max-w-[1200px]"> {/* Aumentamos un poco el ancho máximo en PC */}
           {!selectedVisit ? (
             <div className="space-y-4">
               {/* ... (Tabs se mantienen igual) */}

               {loading ? (
                 <div className="p-20 text-center font-black text-gray-300 animate-pulse uppercase tracking-widest">Sincronizando...</div>
               ) : activeTab === 'pendientes' ? (
                 // ... (Render de pendientes igual)
                 <div className="space-y-4">
                   {/* ... contenido de pendientes ... */}
                 </div>
               ) : (
                 /* 📜 HISTORIAL CON DISEÑO HORIZONTAL OPTIMIZADO */
                 <div className="space-y-4">
                    {repHistory.length === 0 ? (
                      <div className="bg-white p-12 rounded-[40px] text-center border border-dashed border-gray-200">
                        <History className="text-gray-200 mb-4 mx-auto" size={48} />
                        <p className="text-gray-400 font-bold uppercase text-[10px]">No tienes reportes recientes.</p>
                      </div>
                    ) : (
                      repHistory.map(r => (
                        <div key={r.id} className="w-full bg-white p-6 md:p-8 rounded-[35px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          {/* Contenedor Principal: Vertical en móvil, Horizontal en PC */}
                          <div className="flex flex-col md:grid md:grid-cols-12 md:items-center gap-4 md:gap-8">
                            
                            {/* 1. Información del Médico (Columna 1-4 en PC) */}
                            <div className="flex items-center gap-4 md:col-span-4 min-w-0">
                               <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                                 <CheckCircle size={24}/>
                               </div>
                               <div className="min-w-0">
                                 <p className="font-black text-gray-900 uppercase leading-tight mb-1 text-sm truncate">
                                   {r.doctorName}
                                 </p>
                                 <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                                   <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md whitespace-nowrap">
                                     {r.reportedAt?.toDate ? r.reportedAt.toDate().toLocaleDateString() : new Date(r.reportedAt).toLocaleDateString()}
                                   </span>
                                   <span className={r.status === 'Realizada' ? 'text-green-500' : 'text-orange-500'}>
                                     {r.status}
                                   </span>
                                 </div>
                               </div>
                            </div>

                            {/* 2. Comentario de Seguimiento (Columna 5-10 en PC) - ¡AQUÍ ESTÁ EL CAMBIO! */}
                            <div className="md:col-span-6 flex-1">
                              {r.observations ? (
                                <div className="p-4 bg-gray-50 rounded-[24px] border-l-4 border-blue-400 h-full flex flex-col justify-center">
                                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter mb-1 flex items-center gap-1">
                                    <MessageSquare size={10} /> Seguimiento Anterior:
                                  </p>
                                  <p className="text-[11px] text-gray-600 font-medium leading-relaxed italic line-clamp-3 md:line-clamp-none">
                                    {r.observations}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-300 italic text-center md:text-left">Sin observaciones registradas.</p>
                              )}
                            </div>

                            {/* 3. Muestras (Columna 11-12 en PC) */}
                            <div className="md:col-span-2 text-right border-t md:border-none pt-3 md:pt-0">
                              <p className="text-[10px] font-black text-gray-400 uppercase mb-1 block md:hidden">Muestras:</p>
                              <p className="text-[9px] font-bold text-gray-500 italic leading-tight">
                                {r.samples?.length > 0 
                                  ? r.samples.map((s:any) => `${s.qty}x ${s.name}`).join(', ') 
                                  : 'Sin muestras'}
                              </p>
                            </div>

                          </div>
                        </div>
                      ))
                    )}
                 </div>
               )}
             </div>
           ) : (
             /* ... Formulario de reporte igual ... */
             <div className="bg-white p-8 rounded-[40px]">
               {/* Contenido del formulario */}
             </div>
           )}
        </div>
      )}
    </div>
  )
}