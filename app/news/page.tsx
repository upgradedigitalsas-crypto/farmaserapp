'use client'
import { Megaphone, ChevronRight, Star, MessageSquare, Eye, Rocket } from 'lucide-react'

const UPDATES = [
  {
    id: 1,
    tag: 'Bienvenida',
    title: '¡Arrancamos un nuevo ciclo!',
    description: 'Te damos la bienvenida al inicio de este nuevo mes laboral. Hemos diseñado esta sección de novedades para mantenerte al día con las herramientas que creamos para facilitar tu trabajo en la calle. ¡Mucho éxito en tus visitas de esta semana!',
    date: 'Hoy',
    icon: <Rocket className="text-indigo-600" size={20} />,
    color: 'bg-indigo-50',
  },
  {
    id: 2,
    tag: 'Tu Desempeño',
    title: 'Tus logros, en un solo vistazo',
    description: 'Agregamos un banner visual interactivo en tu Dashboard. Ahora, al iniciar tu día, podrás ver un resumen destacado de tu gestión, efectividad y cobertura del mes que acaba de cerrar. ¡Úsalo como motivación para superar tus propias metas!',
    date: 'Hoy',
    icon: <Star className="text-yellow-500" size={20} />,
    color: 'bg-yellow-50',
  },
  {
    id: 3,
    tag: 'Nueva Función',
    title: 'Historial de seguimiento a la mano',
    description: 'Para hacer tus visitas médicas mucho más efectivas, ahora podrás ver el mensaje de "seguimiento" que dejaste en tu visita anterior directamente en tu módulo de Reportes. También lo encontrarás disponible al momento de planear en el módulo de Visitas.',
    date: 'Hoy',
    icon: <MessageSquare className="text-green-600" size={20} />,
    color: 'bg-green-50',
  },
  {
    id: 4,
    tag: 'Diseño',
    title: 'Mejor visibilidad para la calle',
    description: 'Renovamos el diseño de tu agenda diaria. Volvemos al característico "Azul Farmaser" sólido en tus tarjetas de visitas para garantizar que puedas leer tu programación con total claridad, incluso cuando estés bajo la luz del sol.',
    date: 'Reciente',
    icon: <Eye className="text-blue-600" size={20} />,
    color: 'bg-blue-50',
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
        <p className="text-gray-500 font-medium ml-1">Descubre las nuevas herramientas y mejoras diseñadas para potenciar tu día a día.</p>
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
            Farmaser S.A. • Gestión Pro
          </p>
          <div className="h-1 w-12 bg-blue-100 rounded-full"></div>
        </div>
      </footer>
    </div>
  )
}