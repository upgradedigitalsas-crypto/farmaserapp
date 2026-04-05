'use client'
import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    if (email.trim()) {
      useAuthStore.setState({ user: { id: '1', email: email.trim(), name: 'Visitador', role: 'visitor' } })
      router.push('/visits')
    }
    
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm mx-auto">
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Email del Visitador</label>
        <input 
          type="email" 
          required 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 text-sm" 
          placeholder="tu@email.com" 
        />
      </div>
      <button 
        type="submit" 
        disabled={loading || !email} 
        className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-sm shadow-xl hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest mt-4"
      >
        {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
      </button>
    </form>
  )
}
