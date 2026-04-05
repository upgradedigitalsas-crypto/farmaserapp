'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const setUser = useAuthStore((state) => state.setUser)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null; // No renderiza NADA en el servidor, evita el error de Firestore

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      setUser({
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        name: userCredential.user.displayName || 'Visitador',
        role: 'visitor',
      })
      router.push('/dashboard')
    } catch (err: any) {
      setError('Credenciales incorrectas.')
    }
  }

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      setUser({
        id: result.user.uid,
        email: result.user.email || '',
        name: result.user.displayName || 'Usuario Google',
        role: 'visitor',
      })
      router.push('/dashboard')
    } catch (err) {
      setError('Error con Google.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Farmaser</h1>
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold">
            Entrar
          </button>
        </form>
        <button onClick={handleGoogleLogin} className="mt-4 w-full border p-4 rounded-2xl font-semibold flex items-center justify-center gap-2">
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />
          Google
        </button>
      </div>
    </div>
  )
}
