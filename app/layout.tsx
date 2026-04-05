'use client';
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import './globals.css';

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) return null;

  const isLoginPage = pathname === '/login' || !user;

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden relative">
      
      {/* 1. BOTÓN HAMBURGUESA (Solo visible en móviles) */}
      <button 
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* 2. SIDEBAR PARA PC (Normal) */}
      <aside className="hidden lg:flex w-64 h-full flex-shrink-0">
        <Sidebar />
      </aside>

      {/* 3. SIDEBAR PARA MÓVIL (Overlay que se desliza) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Fondo oscuro transparente para cerrar al tocar fuera */}
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          <div className="relative w-64 h-full bg-slate-900 shadow-xl animate-in slide-in-from-left duration-300">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-white p-1"
            >
              <X size={24} />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* 4. CONTENIDO PRINCIPAL */}
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
