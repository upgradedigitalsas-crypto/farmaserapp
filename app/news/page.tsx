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
    <div className="p-4 pt-20 lg:p-10 lg:ml-64 max-w-[900px] min-h-screen bg-[#F5F5F7]">

      {/* Cabecera */}
      <header className="mb-10">
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0">
            <Megaphone size={18} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Novedades</h1>
        </div>
        <p className="text-sm text-gray-500 ml-[3.375rem]">
          Nuevas herramientas y mejoras diseñadas para potenciar tu día a día.
        </p>
      </header>

      {/* Cards */}
      <div className="space-y-3">
        {UPDATES.map((item) => (
          <div key={item.id} className="group bg-white rounded-2xl shadow-sm border border-black/[0.05] hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="flex items-start gap-5 p-6">

              <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                {item.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${item.color} text-gray-600`}>
                    {item.tag}
                  </span>
                  <span className="text-[10px] text-gray-300 font-medium">{item.date}</span>
                </div>
                <h2 className="text-base font-semibold text-gray-900 mb-1.5 leading-snug">
                  {item.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="hidden md:flex items-center self-center text-gray-200 group-hover:text-blue-400 transition-colors shrink-0">
                <ChevronRight size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center py-8 border-t border-gray-200/70">
        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">
          Farmaser S.A. · Gestión Pro
        </p>
      </footer>
    </div>
  )
}