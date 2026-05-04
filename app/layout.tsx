'use client';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from './components/layout/Sidebar'; 
import { usePathname } from 'next/navigation';
import './globals.css';

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const pathname = usePathname();

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center font-black text-gray-400 animate-pulse">
      CARGANDO FARMASEER...
    </div>
  );

  const isApiRoute = pathname?.startsWith('/api/');
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  if (isApiRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden relative">
      
      {/* El menú lateral visual */}
      <Sidebar />

      {/* 🛡️ LA SOLUCIÓN: Este bloque invisible ocupa los 64px del menú en PC. 
          Evita que la página se meta debajo del menú y bloquee los clics. */}
      <div className="hidden lg:block w-64 h-full flex-shrink-0"></div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto w-full relative z-0">
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