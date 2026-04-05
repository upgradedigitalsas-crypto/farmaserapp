'use client'
import { useAuthStore } from '@/lib/store'

export default function AdminPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-10">
      <div className="bg-white p-12 rounded-[40px] shadow-sm border border-gray-100 max-w-lg w-full text-center">
        <div className="text-[80px] mb-6 opacity-20 select-none">⚙️</div>
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4 leading-tight">
          Panel Administrativo<br/><span className="text-blue-600">En Conexión</span>
        </h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8 leading-relaxed">
          Esta sección está siendo migrada a la nueva base de datos en tiempo real (Firebase). Por favor, utiliza las vistas operativas por el momento.
        </p>
        <div className="flex flex-col gap-3">
          <a href="/visits" className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:bg-blue-700 transition-all">
            Ir a Planeación de Visitas
          </a>
          <a href="/itinerary" className="w-full py-4 bg-white text-gray-600 border border-gray-200 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all">
            Ir a Itinerario
          </a>
        </div>
      </div>
    </div>
  )
}
