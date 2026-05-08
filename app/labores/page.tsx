import React from 'react';
import { Sun, Calendar, Clock, Award, CheckCircle2, BookOpen } from 'lucide-react';

export default function LaboresPage() {
  const secciones = [
    {
      titulo: 'Diariamente',
      icon: <Sun size={18} className="text-orange-500" />,
      accent: 'border-orange-200 bg-orange-50',
      dot: 'bg-orange-500',
      items: [
        'Reportarse con el Jefe asignado entre 7:30–8:00 am.',
        'Visita Médica Vendedora y Labor Efectiva en Farmacia.',
        'Reporte por plataforma móvil en el momento y lugar de la visita.',
        'Informe diario con acumulados en Agenda Digital.',
        'Cumplir la cuota de ventas y cobro.',
      ],
    },
    {
      titulo: 'Semanalmente',
      icon: <Calendar size={18} className="text-blue-500" />,
      accent: 'border-blue-200 bg-blue-50',
      dot: 'bg-blue-500',
      items: [
        'Plan de trabajo semanal (Jueves) por plataforma Gestión Diaria Farmaser.',
        'Actividades los sábados según instrucciones del Dpto Comercial.',
        'Envío de correo (Sábados).',
        'Cuentas de Gasto de viaje de la semana.',
      ],
    },
    {
      titulo: 'Mensualmente',
      icon: <Clock size={18} className="text-violet-500" />,
      accent: 'border-violet-200 bg-violet-50',
      dot: 'bg-violet-500',
      items: [
        'Itinerario con hora de salida y llegada (día 2 de cada mes).',
        'Presupuesto de Cobro y Venta (primeros 5 días).',
        'Solicitud de requerimientos médicos (primeros 8 días).',
        'Solicitud de Eventos con mínimo 20 días de anticipación.',
      ],
    },
    {
      titulo: 'Otras Responsabilidades',
      icon: <Award size={18} className="text-emerald-500" />,
      accent: 'border-emerald-200 bg-emerald-50',
      dot: 'bg-emerald-500',
      items: [
        'Cobertura Médica 90% (144) y Droguerías 100% (160).',
        'Consolidar panel médico y droguerías.',
        'Autocapacitación constante.',
        'Comunicar novedades (permisos, incapacidades) oportunamente.',
      ],
    },
  ];

  return (
    <div className="p-4 pt-20 lg:p-10 lg:ml-64 max-w-[1100px] min-h-screen bg-[#F5F5F7]">

      {/* Cabecera */}
      <header className="mb-8">
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
            <BookOpen size={18} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Labores Visitador</h1>
        </div>
        <p className="text-sm text-gray-500 ml-[3.375rem]">
          Manual operativo y responsabilidades institucionales.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
        {secciones.map((sec, idx) => (
          <div key={idx} className={`bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden`}>
            {/* Header de sección */}
            <div className={`flex items-center gap-3 px-5 py-4 border-b ${sec.accent}`}>
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                {sec.icon}
              </div>
              <h2 className="text-sm font-semibold text-gray-800">{sec.titulo}</h2>
            </div>

            {/* Ítems */}
            <ul className="p-5 space-y-3">
              {sec.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                  <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
