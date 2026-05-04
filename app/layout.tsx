'use client';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from './components/layout/Sidebar'; 
import { usePathname } from 'next/navigation';
import './globals.css';

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Variable 2: Espera a verificar si hay usuario antes de tomar decisiones
  if (loading) return null; 

  const isApiRoute = pathname?.startsWith('/api/');
  
  // Variable 1 y 7: La regla de oro ORIGINAL. Si no hay usuario o es /login, renderiza sin menú.
  // Esto es lo que hace que el botón de SALIR funcione perfectamente.
  const isLoginPage = (!isApiRoute && pathname === '/login') || (!isApiRoute && !user);

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  if (isApiRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden relative">
      
      {/* Variable 4 y 5: Renderizamos el Sidebar SUELTO, sin esconderlo en móviles. 
          Así su propio botón hamburguesa y su propia lógica se encargan de todo. */}
      <Sidebar />

      {/* Variable 3: El "Fantasma". Este bloque de 64px SÓLO aparece en PC (lg:block).
          Su único trabajo es empujar el main hacia la derecha para que el Sidebar no tape el botón SALIR. */}
      <div className="hidden lg:block w-64 h-full flex-shrink-0"></div>

      {/* Contenido Principal */}
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