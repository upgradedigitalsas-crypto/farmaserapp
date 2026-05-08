'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuthStore, TEAM_MAPPING } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { Send, Hash, Loader2, Users, X } from 'lucide-react'

// ── CONFIG ────────────────────────────────────────────────────────────────────
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
const ADMIN_EMAIL = 'entrenamientofarmaser@gmail.com'
const ALL_MEMBERS = [ADMIN_EMAIL, ...Object.values(TEAM_MAPPING).flat()]
  .filter((v, i, a) => a.indexOf(v) === i)

const CHANNEL_MEMBERS: Record<string, string[]> = {
  'general':        ALL_MEMBERS,
  'equipo-leidys':  TEAM_MAPPING['lcontreras.farmaser@gmail.com'] || [],
  'equipo-luis':    TEAM_MAPPING['langulo.farmaser@gmail.com'] || [],
  'equipo-yuliana': TEAM_MAPPING['ypelaez.farmaser@gmail.com'] || [],
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function nameFromEmail(email: string): string {
  if (email.includes('entrenamiento')) return 'Admin'
  const username = email.split('@')[0].replace('.farmaser', '')
  if (username.length <= 1) return username.toUpperCase()
  return `${username[0].toUpperCase()}. ${username[1].toUpperCase()}${username.slice(2)}`
}
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
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
}
const AVATAR_COLORS = ['bg-blue-500','bg-orange-500','bg-green-500','bg-purple-500','bg-pink-500','bg-teal-500','bg-red-500','bg-indigo-500']
function avatarColor(email: string) {
  return AVATAR_COLORS[email.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuthStore()
  const [messages, setMessages]       = useState<any[]>([])
  const [text, setText]               = useState('')
  const [sending, setSending]         = useState(false)
  const [activeChannel, setActiveChannel] = useState('general')
  const [loading, setLoading]         = useState(true)
  const [showMembers, setShowMembers] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  const userEmail = user?.email?.toLowerCase().trim() || ''
  const userName  = user?.name || nameFromEmail(userEmail)
  const isAdmin   = user?.role === 'admin' || userEmail === ADMIN_EMAIL

  // ── Canales accesibles ───────────────────────────────────────────────────
  const accessibleChannels = useMemo(() => {
    if (isAdmin) return Object.keys(CHANNEL_LABELS)
    const channels = ['general']
    const direct = Object.entries(CHANNEL_MANAGER).find(([, mgr]) => mgr === userEmail)
    if (direct) { channels.push(direct[0]) }
    else {
      for (const [mgr] of Object.entries(CHANNEL_MANAGER)) {
        if ((TEAM_MAPPING[mgr] || []).includes(userEmail)) {
          const e = Object.entries(CHANNEL_MANAGER).find(([, m]) => m === mgr)
          if (e) channels.push(e[0])
          break
        }
      }
    }
    return channels
  }, [userEmail, isAdmin])

  // ── Firestore listener (con fallback si falta el índice compuesto) ──────
  useEffect(() => {
    setLoading(true)
    let fallbackUnsub: (() => void) | null = null

    const q = query(
      collection(db, 'chat_messages'),
      where('channel', '==', activeChannel),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(
      q,
      snap => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      _err => {
        // Índice compuesto aún no creado → fallback sin orderBy + sort cliente
        const q2 = query(collection(db, 'chat_messages'), where('channel', '==', activeChannel))
        fallbackUnsub = onSnapshot(q2, snap2 => {
          const msgs = snap2.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0))
          setMessages(msgs)
          setLoading(false)
        })
      }
    )
    return () => { unsub(); fallbackUnsub?.() }
  }, [activeChannel])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Enviar ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await addDoc(collection(db, 'chat_messages'), {
        channel: activeChannel, userEmail, userName,
        text: text.trim(), createdAt: Timestamp.now(),
      })
      setText('')
      inputRef.current?.focus()
    } catch { alert('Error al enviar mensaje') }
    finally { setSending(false) }
  }
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Agrupar por fecha ────────────────────────────────────────────────────
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

  const channelMembers = CHANNEL_MEMBERS[activeChannel] || []

  return (
    <div className="flex h-full overflow-hidden bg-[#F8FAFC]">

      {/* ── PANEL IZQUIERDO (desktop) ──────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 bg-[#0F172A] text-white flex-col shrink-0">
        {/* Encabezado */}
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-xs font-black text-white uppercase tracking-widest">Chat Interno</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Farmaser — Trial v1</p>
        </div>

        {/* Canales */}
        <div className="px-2 pt-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-1">Canales</p>
          <nav className="space-y-0.5">
            {accessibleChannels.map(ch => (
              <button key={ch} onClick={() => setActiveChannel(ch)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  activeChannel === ch ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}>
                <Hash size={13} className="shrink-0" />
                <span className="truncate flex-1">{CHANNEL_LABELS[ch]}</span>
                <span className="text-[9px] opacity-50">{CHANNEL_MEMBERS[ch]?.length}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Miembros del canal */}
        <div className="px-2 pt-4 flex-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2">
            Miembros · {channelMembers.length}
          </p>
          <div className="space-y-0.5">
            {channelMembers.map(email => (
              <div key={email} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 group">
                <div className={`w-6 h-6 rounded-full ${avatarColor(email)} flex items-center justify-center text-white text-[9px] font-black shrink-0`}>
                  {getInitials(nameFromEmail(email))}
                </div>
                <span className="text-[11px] text-gray-400 truncate group-hover:text-gray-200 transition-colors flex-1">
                  {nameFromEmail(email)}
                </span>
                {email === userEmail && <span className="text-[9px] text-blue-400 font-black">tú</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Usuario actual */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${avatarColor(userEmail)} flex items-center justify-center text-white text-xs font-black shrink-0`}>
              {getInitials(userName)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{userName}</p>
              <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Tabs de canal (mobile) */}
        <div className="md:hidden bg-[#0F172A] pl-16 pr-2 pt-2">
          <div className="flex gap-1 overflow-x-auto pb-0" style={{scrollbarWidth:'none'}}>
            {accessibleChannels.map(ch => (
              <button key={ch} onClick={() => setActiveChannel(ch)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition-all ${
                  activeChannel === ch ? 'bg-[#F8FAFC] text-gray-900' : 'text-gray-400 hover:text-white'
                }`}>
                <Hash size={11} />{CHANNEL_LABELS[ch]}
              </button>
            ))}
          </div>
        </div>

        {/* Header del canal */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Hash size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-black text-gray-900 text-sm">{CHANNEL_LABELS[activeChannel]}</h1>
              <p className="text-[11px] text-gray-400">
                {activeChannel === 'general' ? 'Todo el equipo Farmaser' : 'Canal privado del equipo'}
              </p>
            </div>

            {/* Avatares superpuestos + botón miembros */}
            <button onClick={() => setShowMembers(!showMembers)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 transition-colors rounded-xl px-2 py-1.5 hover:bg-gray-50">
              <div className="flex -space-x-2">
                {channelMembers.slice(0, 4).map(email => (
                  <div key={email} className={`w-6 h-6 rounded-full border-2 border-white ${avatarColor(email)} flex items-center justify-center text-white text-[8px] font-black`}>
                    {getInitials(nameFromEmail(email))}
                  </div>
                ))}
                {channelMembers.length > 4 && (
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-gray-600 text-[8px] font-black">
                    +{channelMembers.length - 4}
                  </div>
                )}
              </div>
              <span className="font-bold hidden sm:inline">{channelMembers.length} miembros</span>
              <Users size={13} className="sm:hidden" />
            </button>
          </div>

          {/* Panel de miembros expandible */}
          {showMembers && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  Miembros del canal ({channelMembers.length})
                </p>
                <button onClick={() => setShowMembers(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {channelMembers.map(email => (
                  <div key={email} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
                    <div className={`w-5 h-5 rounded-full ${avatarColor(email)} flex items-center justify-center text-white text-[8px] font-black`}>
                      {getInitials(nameFromEmail(email))}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700">{nameFromEmail(email)}</span>
                    {email === userEmail && <span className="text-[9px] text-blue-500 font-black">tú</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                <Hash size={26} className="text-blue-300" />
              </div>
              <p className="font-black text-gray-700">Inicio de #{CHANNEL_LABELS[activeChannel]}</p>
              <p className="text-gray-400 text-sm mt-1">Sé el primero en escribir algo.</p>
            </div>
          ) : (
            groupedMessages.map(group => (
              <div key={group.date}>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">{group.date}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                {group.messages.map((msg, i) => {
                  const prev = i > 0 ? group.messages[i - 1] : null
                  const isSameUser = prev?.userEmail === msg.userEmail
                  const isMe = msg.userEmail === userEmail
                  return (
                    <div key={msg.id} className={`flex gap-2.5 ${isSameUser ? 'mt-0.5' : 'mt-3'} ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isSameUser ? (
                        <div className={`w-8 h-8 rounded-full ${avatarColor(msg.userEmail)} flex items-center justify-center text-white text-[10px] font-black shrink-0 mt-0.5`}>
                          {getInitials(msg.userName || nameFromEmail(msg.userEmail))}
                        </div>
                      ) : <div className="w-8 shrink-0" />}
                      <div className={`max-w-[78%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isSameUser && (
                          <div className={`flex items-baseline gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs font-black text-gray-700">{msg.userName || nameFromEmail(msg.userEmail)}</span>
                            <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                          </div>
                        )}
                        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
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
        <div className="bg-white border-t border-gray-100 p-3 shrink-0">
          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-2.5 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Mensaje en #${CHANNEL_LABELS[activeChannel]}...`}
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none font-medium leading-relaxed max-h-28"
              style={{ minHeight: '22px' }}
            />
            <button onClick={handleSend} disabled={!text.trim() || sending}
              className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-all shrink-0 shadow-sm shadow-blue-200">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 ml-1 hidden sm:block">Enter para enviar · Shift+Enter para nueva línea</p>
        </div>
      </div>
    </div>
  )
}
