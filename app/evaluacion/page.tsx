'use client';
import React from 'react';
import { BarChart3, Lock } from 'lucide-react';
import dynamic from 'next/dynamic';
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
import animationData from '@/public/animations/fomo.json';
export default function EvaluacionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center bg-gray-50">
      <div className="relative mb-6">
        <BarChart3 className="h-20 w-20 text-slate-300" />
        <Lock className="absolute -bottom-2 -right-2 h-8 w-8 text-blue-600 bg-white rounded-full p-1 shadow-md" />
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-4 max-w-2xl">
        Módulo Premium: Para activar esta funcionalidad y acceder al contenido, contacta al administrador de la App.
      </h3>
      <div className="w-72 h-72">
        <Lottie animationData={animationData} loop={true} />
      </div>
    </div>
  );
}
