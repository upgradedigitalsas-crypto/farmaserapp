'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const setUser = useAuthStore((state) => state.setUser)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)

    // EL RADAR: Vigila constantemente si el usuario está logueado
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          id: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || 'Usuario Google',
          role: 'visitor',
        })
        router.push('/dashboard')
      }
    })

    // Atrapa errores si la redirección en celular falla
    getRedirectResult(auth).catch(() => {
      setError('Error al procesar el login con Google.')
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [setUser, router])

  if (!isMounted) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // No hacemos push aquí, el Radar se encarga
    } catch (err: any) {
      setError('Credenciales incorrectas.')
      setIsLoading(false)
    }
  }

  // LÓGICA HÍBRIDA: Intenta Popup primero (PC), si falla, usa Redirect (Móvil).
  const handleGoogleLogin = async () => {
    setError('')
    setIsLoading(true)
    const provider = new GoogleAuthProvider()
    
    try {
      // 1. Intentamos el método original rápido (Perfecto para PC y Android)
      await signInWithPopup(auth, provider)
    } catch (err: any) {
      // 2. Si el navegador (Safari/In-App) bloquea el popup, usamos la redirección
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, provider)
        } catch (redirectErr) {
          setError('No se pudo redirigir a Google.')
          setIsLoading(false)
        }
      } else {
        setError('Acceso con Google cancelado o fallido.')
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
        
        <img 
          src="/Farmaser%20Logo.png" 
          alt="Farmaser Logo" 
          className="h-16 w-auto mx-auto mb-6 object-contain" 
        />

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl">{error}</p>}
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold disabled:bg-blue-400 disabled:cursor-not-allowed transition-all"
            disabled={isLoading}
          >
            {isLoading ? 'Cargando...' : 'Entrar'}
          </button>
        </form>

        <button 
          onClick={handleGoogleLogin} 
          className="mt-4 w-full border p-4 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
          disabled={isLoading}
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />
          {isLoading ? 'Conectando...' : 'Google'}
        </button>
      </div>
    </div>
  )
}