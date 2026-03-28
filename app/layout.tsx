import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Farmaser - Gestión de Visitadores',
  description: 'App de gestión de visitadores médicos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
