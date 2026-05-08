'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuthStore, TEAM_MAPPING } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { Send, MessageSquare, Hash, Loader2 } from 'lucide-react'

// ── DEFINICIÓN DE CANALES ─────────────────────────────────────────────────────
const CHANNEL_MANAGER: Record<string, string> = {
  'equipo-leidys':  'lcontreras.farmaser@gmail.com',
  'equipo-luis':    'langulo.farmaser@gmail.com',
  'equipo-yuliana': 'ypelaez.farmaser@gmail.com',
}

const CHANNEL_LABELS: Record<string, string> = {
  'general':        'General',
  'equipo-leidys':  'Equipo Leidys',
  'equipo-luis':    'Equipo Luis Carlos',
  'equipo-yuliana': 'Equipo Yuliana',
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatTime(ts: any): string {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: any): string {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [activeChannel, setActiveChannel] = useState('general')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const userEmail = user?.email?.toLowerCase().trim() || ''
  const userName = user?.name || userEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())
  const isAdmin = user?.role === 'admin' || userEmail === 'entrenamientofarmaser@gmail.com'

  // ── Canales accesibles según rol ─────────────────────────────────────────────
  const accessibleChannels = useMemo(() => {
    if (isAdmin) return Object.keys(CHANNEL_LABELS)

    const channels: string[] = ['general']

    // Manager: accede a su canal de equipo
    if (TEAM_MAPPING[userEmail]) {
      const entry = Object.entries(CHANNEL_MANAGER).find(([, mgr]) => mgr === userEmail)
      if (entry) channels.push(entry[0])
    } else {
      // Visitador: busca a qué equipo pertenece
      for (const [managerEmail, team] of Object.entries(TEAM_MAPPING)) {
        if (team.includes(userEmail)) {
          const entry = Object.entries(CHANNEL_MANAGER).find(([, mgr]) => mgr === managerEmail)
          if (entry) channels.push(entry[0])
          break
        }
      }
    }

    return channels
  }, [userEmail, isAdmin])

  // ── Listener en tiempo real ───────────────────────────────────────────────
  useEffect(() => {
    if (!activeChannel) return
    setLoading(true)
    const q = query(
      collection(db, 'chat_messages'),
      where('channel', '==', activeChannel),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [activeChannel])

  // ── Scroll automático al último mensaje ──────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Enviar mensaje ────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await addDoc(collection(db, 'chat_messages'), {
        channel: activeChannel,
        userEmail,
        userName,
        text: text.trim(),
        createdAt: Timestamp.now(),
      })
      setText('')
    } catch (e) {
      alert('Error al enviar mensaje')
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Agrupar mensajes por fecha ────────────────────────────────────────────
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: any[] }[] = []
    messages.forEach(msg => {
      const date = formatDate(msg.createdAt)
      const last = groups[groups.length - 1]
      if (last && last.date === date) last.messages.push(msg)
      else groups.push({ date, messages: [msg] })
    })
    return groups
  }, [messages])

  // ── Colores de avatar por usuario ─────────────────────────────────────────
  const AVATAR_COLORS = [
    'bg-blue-500', 'bg-orange-500', 'bg-green-500', 'bg-purple-500',
    'bg-pink-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500',
  ]
  const avatarColor = (email: string) => {
    const idx = email.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length
    return AVATAR_COLORS[idx]
  }

  return (
    <div className="pt-16 lg:pt-0 lg:pl-64 h-screen flex flex-col bg-[#F8FAFC]">
      <div className="flex flex-1 overflow-hidden">

        {/* ── PANEL IZQUIERDO: Canales ─────────────────────────────────────── */}
        <aside className="w-64 bg-[#0F172A] text-white flex flex-col shrink-0 hidden md:flex">
          <div className="p-5 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-400" />
              <h2 className="font-black text-sm uppercase tracking-widest text-gray-200">Chat Interno</h2>
            </div>
            <p className="text-[10px] text-gray-500 mt-1 font-medium">Farmaser — Trial v1</p>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {accessibleChannels.map(ch => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left ${
                  activeChannel === ch
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Hash size={16} className="shrink-0" />
                <span className="truncate">{CHANNEL_LABELS[ch]}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-800">
            <div className={`w-8 h-8 rounded-full ${avatarColor(userEmail)} flex items-center justify-center text-white text-xs font-black`}>
              {getInitials(userName)}
            </div>
            <p className="text-[11px] text-gray-400 mt-1 truncate font-medium">{userEmail}</p>
          </div>
        </aside>

        {/* ── PANEL DERECHO: Mensajes ──────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Header del canal */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shadow-sm shrink-0">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Hash size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="font-black text-gray-900 text-base">{CHANNEL_LABELS[activeChannel]}</h1>
              <p className="text-xs text-gray-400 font-medium">
                {activeChannel === 'general'
                  ? 'Visible para todo el equipo Farmaser'
                  : `Canal privado del equipo`}
              </p>
            </div>

            {/* Selector de canal en mobile */}
            <div className="ml-auto md:hidden">
              <select
                value={activeChannel}
                onChange={e => setActiveChannel(e.target.value)}
                className="text-xs font-bold bg-gray-50 border-none rounded-xl px-3 py-2 text-gray-700"
              >
                {accessibleChannels.map(ch => (
                  <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <Hash size={32} className="text-blue-300" />
                </div>
                <p className="font-black text-gray-700 text-lg">Este es el inicio de #{CHANNEL_LABELS[activeChannel]}</p>
                <p className="text-gray-400 text-sm mt-1">Se el primero en escribir algo.</p>
              </div>
            ) : (
              groupedMessages.map(group => (
                <div key={group.date}>
                  {/* Separador de fecha */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[11px] font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">{group.date}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {group.messages.map((msg, i) => {
                    const prev = i > 0 ? group.messages[i - 1] : null
                    const isSameUser = prev && prev.userEmail === msg.userEmail
                    const isMe = msg.userEmail === userEmail

                    return (
                      <div key={msg.id} className={`flex gap-3 ${isSameUser ? 'mt-0.5' : 'mt-3'} ${isMe ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        {!isSameUser ? (
                          <div className={`w-8 h-8 rounded-full ${avatarColor(msg.userEmail)} flex items-center justify-center text-white text-[10px] font-black shrink-0 mt-0.5`}>
                            {getInitials(msg.userName || msg.userEmail)}
                          </div>
                        ) : (
                          <div className="w-8 shrink-0" />
                        )}

                        {/* Burbuja */}
                        <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          {!isSameUser && (
                            <div className={`flex items-baseline gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                              <span className="text-xs font-black text-gray-700">{msg.userName || msg.userEmail.split('@')[0]}</span>
                              <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                            </div>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-tr-sm'
                              : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                          }`}>
                            {msg.text}
                          </div>
                          {isSameUser && (
                            <span className="text-[10px] text-gray-300 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-100 p-4 shrink-0">
            <div className="flex items-end gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Mensaje en #${CHANNEL_LABELS[activeChannel]}...`}
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none font-medium leading-relaxed max-h-32"
                style={{ minHeight: '24px' }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-all shrink-0 shadow-md shadow-blue-100"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Enter para enviar · Shift+Enter para nueva línea</p>
          </div>
        </main>
      </div>
    </div>
  )
}
