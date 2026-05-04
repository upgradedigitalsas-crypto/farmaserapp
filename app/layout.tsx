'use client';
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
// CORRECCIÓN: La ruta según tu carpeta es components/layout/Sidebar
import Sidebar from './components/layout/Sidebar'; 
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import './globals.css';

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center font-black text-gray-400 animate-pulse">
      CARGANDO FARMASEER...
    </div>
  );

  const isApiRoute = pathname?.startsWith('/api/');
  
  // 🛡️ REVISIÓN DE SEGURIDAD:
  // Solo ocultamos el menú si es la página de login explícita.
  // Para el resto de páginas, si no hay usuario, el middleware o el AuthProvider 
  // deberían redireccionar, pero permitimos que el Layout intente renderizar.
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  if (isApiRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden relative">
      {/* Botón de Menú Móvil */}
      <button 
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* SIDEBAR ESCRITORIO */}
      <aside className="hidden lg:flex w-64 h-full flex-shrink-0 bg-[#0F172A]">
        <Sidebar />
      </aside>

      {/* SIDEBAR MÓVIL */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative w-64 h-full bg-[#0F172A] shadow-xl animate-in slide-in-from-left duration-300">
            <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 text-white p-1">
              <X size={24} />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased m-0 p-0 overflow-hidden">
        <AuthProvider>
          <RootLayoutContent>{children}</RootLayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}