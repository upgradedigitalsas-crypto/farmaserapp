import React from 'react';
import { Sun, Calendar, Clock, Award, CheckCircle2 } from 'lucide-react';

export default function LaboresPage() {
  const secciones = [
    {
      titulo: 'Diariamente',
      icon: <Sun className="text-orange-500" />,
      items: [
        'Reportarse con el Jefe asignado entre 7:30-8:00 am.',
        'Visita Médica Vendedora y Labor Efectiva en Farmacia.',
        'Reporte por plataforma móvil en el momento y lugar de la visita.',
        'Informe diario con acumulados en Agenda Digital.',
        'CUMPLIR LA CUOTA DE VENTAS Y COBRO.'
      ]
    },
    {
      titulo: 'Semanalmente',
      icon: <Calendar className="text-blue-500" />,
      items: [
        'Plan de trabajo semanal (Jueves) por plataforma Gestión Diaria Farmaser.',
        'Actividades los sábados según instrucciones del Dpto Comercial.',
        'Envío de correo (Sábados).',
        'Cuentas de Gasto de viaje de la semana.'
      ]
    },
    {
      titulo: 'Mensualmente',
      icon: <Clock className="text-purple-500" />,
      items: [
        'Itinerario con hora de salida y llegada (día 2 de cada mes).',
        'Presupuesto de Cobro y Venta (primeros 5 días).',
        'Solicitud de requerimientos médicos (primeros 8 días).',
        'Solicitud de Eventos con mínimo 20 días de anticipación.'
      ]
    },
    {
      titulo: 'Otras Responsabilidades',
      icon: <Award className="text-green-500" />,
      items: [
        'Cobertura Médica 90% (144) y Droguerías 100% (160).',
        'Consolidar panel médico y droguerías.',
        'Autocapacitación constante.',
        'Comunicar novedades (permisos, incapacidades) oportunamente.'
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Labores Visitador</h1>
        <p className="text-slate-500 mt-2 text-lg">Manual operativo y responsabilidades institucionales.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {secciones.map((sec, idx) => (
          <div key={idx} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-50 rounded-xl">{sec.icon}</div>
              <h2 className="text-xl font-bold text-slate-800">{sec.titulo}</h2>
            </div>
            <ul className="space-y-4">
              {sec.items.map((item, i) => (
                <li key={i} className="flex gap-3 text-slate-600 text-sm md:text-base leading-relaxed">
                  <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
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
