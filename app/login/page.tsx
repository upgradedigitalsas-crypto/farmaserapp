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

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          id: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || 'Usuario Google',
          role: 'visitador',
        })
        router.push('/dashboard')
      }
    })

    getRedirectResult(auth).catch(() => {
      setError('Error al procesar el login con Google.')
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [setUser, router])

  if (!isMounted) return null

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: any) {
      setError('Correo o contraseña incorrectos.')
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setIsLoading(true)
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, provider)
        } catch {
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
    <div className="min-h-screen flex bg-[#F5F5F7]">

      {/* ── Panel izquierdo: identidad de marca ────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex-col items-center justify-center p-16">
        {/* Blobs decorativos */}
        <div className="absolute w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -top-32 -left-32 pointer-events-none" />
        <div className="absolute w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px] bottom-20 right-0 pointer-events-none" />
        <div className="absolute w-[200px] h-[200px] bg-cyan-400/5 rounded-full blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <img
            src="/Farmaser%20Logo.png"
            alt="Farmaser Logo"
            className="h-16 w-auto object-contain mb-10 drop-shadow-lg"
          />
          <h2 className="text-2xl font-bold text-white leading-snug tracking-tight">
            Plataforma de Gestión<br />
            <span className="text-blue-400">para Visitadores Médicos</span>
          </h2>
          <p className="text-slate-400 text-sm mt-4 leading-relaxed">
            Planea, reporta y analiza tu gestión<br />en campo desde un solo lugar.
          </p>

          {/* Dots decorativos */}
          <div className="flex gap-2 mt-12">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* ── Panel derecho: formulario ───────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">

          {/* Logo móvil */}
          <div className="flex lg:hidden justify-center mb-8">
            <img src="/Farmaser%20Logo.png" alt="Farmaser Logo" className="h-10 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bienvenido</h1>
            <p className="text-sm text-gray-500 mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="usuario@farmaser.com"
                className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-blue-600/20 active:scale-[0.98] disabled:cursor-not-allowed"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#F5F5F7] px-3 text-xs text-gray-400 font-medium">
                o continúa con
              </span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border border-gray-200 text-gray-700 font-medium py-3.5 rounded-xl flex items-center justify-center gap-2.5 hover:bg-gray-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />
            {isLoading ? 'Conectando...' : 'Google'}
          </button>

          <p className="text-center text-[11px] text-gray-400 mt-8 leading-relaxed">
            Al iniciar sesión aceptas los términos de uso<br />de la plataforma Farmaser.
          </p>
        </div>
      </div>
    </div>
  )
}
