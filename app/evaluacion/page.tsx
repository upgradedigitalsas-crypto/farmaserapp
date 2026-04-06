'use client';
import React from 'react';
import { BarChart3, Lock } from 'lucide-react';
export default function EvaluacionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center bg-gray-50">
      <div className="relative mb-6">
        <BarChart3 className="h-24 w-24 text-slate-300" />
        <Lock className="absolute -bottom-2 -right-2 h-10 w-10 text-blue-600 bg-white rounded-full p-2 shadow-md" />
      </div>
      <h3 className="text-2xl md:text-3xl font-bold text-slate-800 max-w-2xl leading-tight">
        Módulo Premium: Para activar esta funcionalidad y acceder al contenido, contacta al administrador de la App.
      </h3>
    </div>
  );
}
