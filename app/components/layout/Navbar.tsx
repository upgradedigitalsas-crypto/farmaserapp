'use client'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  if (!user) return null

  return (
    <nav className="bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex gap-8 items-center">
          <Link href="/dashboard" className="text-xl font-black tracking-tighter">FARMASER</Link>
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest">
            <Link href="/visits" className="hover:text-blue-400">Planeación</Link>
            <Link href="/itinerary" className="hover:text-blue-400">Itinerario</Link>
          </div>
        </div>
        <button onClick={async () => { await logout(); router.push('/login'); }} className="text-[10px] font-bold bg-red-500/20 px-3 py-1 rounded text-red-400">
          Salir
        </button>
      </div>
    </nav>
  )
}
