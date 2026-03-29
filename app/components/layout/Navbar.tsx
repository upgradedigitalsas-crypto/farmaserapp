'use client'

import { useAuthStore } from '@/lib/store'

export default function Navbar() {
  const { user, logout } = useAuthStore()

  return (
    <nav className="w-full bg-black text-white p-4 flex justify-between items-center">
      <div>Farmaser</div>
      <div className="flex gap-4 items-center">
        {user && <span>{user.displayName}</span>}
        <button onClick={logout} className="bg-red-500 px-3 py-1 rounded">
          Logout
        </button>
      </div>
    </nav>
  )
}
