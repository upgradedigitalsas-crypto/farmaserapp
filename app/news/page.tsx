'use client'
import { Megaphone, Sparkles, Zap, Wrench, ChevronRight, Bell } from 'lucide-react'

// Aquí puedes ir agregando nuevas noticias en el futuro. 
// La más nueva siempre arriba del array.
const UPDATES = [
  {
    id: 1,
    tag: 'Nueva Función',
    title: 'Módulo de Novedades Activo',
    description: '¡Bienvenidos al nuevo centro de noticias! Aquí informaremos sobre cada mejora técnica y visual que implementemos para optimizar su gestión diaria.',
    date: 'Hoy',
    icon: <Bell className="text-indigo-600" size={20} />,
    color: 'bg-indigo-50',
  },
  {
    id: 2,
    tag: 'Mejora',
    title: 'Arquitectura 3.3: Control de Roles',
    description: 'Hemos blindado la seguridad. Ahora los Administradores y Gerentes tienen banners con métricas globales, mientras que los Visitadores mantienen el foco en su desempeño individual.',
    date: 'Hoy',
    icon: <Zap className="text-blue-600" size={20} />,
    color: 'bg-blue-50',
  },
  {
    id: 3,
    tag: 'Diseño',
    title: 'Optimización Visual (High-Contrast)',
    description: 'Restauramos el estilo de tarjetas sólidas en color "Azul Farmaser" para facilitar la lectura de la agenda en condiciones de mucha luz durante las visitas.',
    date: 'Hoy',
    icon: <Sparkles className="text-purple-600" size={20} />,
    color: 'bg-purple-50',
  },
  {
    id: 4,
    tag: 'Corrección',
    title: 'Sincronización de Itinerario',
    description: 'Se resolvió el conflicto de filtros que impedía a algunos visitadores visualizar sus rutas programadas en el calendario mensual.',
    date: 'Ayer',
    icon: <Wrench className="text-orange-600" size={20} />,
    color: 'bg-orange-50',
  }
]

export default function NewsPage() {
  return (
    <div className="p-4 pt-24 lg:p-12 lg:ml-64 max-w-[1000px] min-h-screen bg-[#F8FAFC]">
      
      {/* CABECERA DEL MÓDULO */}
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
            <Megaphone size={24} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic">Novedades</h1>
        </div>
        <p className="text-gray-500 font-medium ml-1">Pulso de actualizaciones y mejoras en la plataforma <span className="text-blue-600 font-bold">Farmaser Gestión Pro</span>.</p>
      </header>

      {/* LISTADO DE ACTUALIZACIONES */}
      <div className="space-y-6">
        {UPDATES.map((item) => (
          <div key={item.id} className="group relative bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              
              {/* Contenedor del Icono */}
              <div className={`w-14 h-14 ${item.color} rounded-3xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500`}>
                {item.icon}
              </div>

              <div className="flex-1">
                {/* Etiquetas Superiores */}
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${item.color} border border-current opacity-70`}>
                    {item.tag}
                  </span>
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">{item.date}</span>
                </div>
                
                {/* Título y Descripción */}
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-3 leading-none">
                  {item.title}
                </h2>
                
                <p className="text-gray-500 font-medium leading-relaxed italic text-sm md:text-base">
                  "{item.description}"
                </p>
              </div>

              {/* Indicador visual de interacción */}
              <div className="hidden md:flex items-center justify-center self-center text-gray-100 group-hover:text-blue-500 transition-colors">
                <ChevronRight size={32} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PIE DE PÁGINA */}
      <footer className="mt-16 text-center py-10 border-t border-dashed border-gray-200">
        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
            Farmaser S.A. • Innovación & Tecnología
          </p>
          <div className="h-1 w-12 bg-blue-100 rounded-full"></div>
        </div>
      </footer>
    </div>
  )
}