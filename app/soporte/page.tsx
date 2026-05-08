'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, Timestamp, doc, setDoc,
} from 'firebase/firestore'
import { Send, Loader2, MessageCircle, User, Inbox, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SUPPORT_ADMIN } from '@/components/SupportWidget'

function formatTime(ts: any) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function nameFromEmail(email: string) {
  return email.split('@')[0].replace(/\./g, ' ').replace('farmaser', '').trim()
    .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const AVATAR_COLORS = ['bg-blue-500','bg-orange-500','bg-green-500','bg-purple-500','bg-pink-500','bg-teal-500','bg-red-500','bg-indigo-500']
function avatarColor(email: string) {
  return AVATAR_COLORS[email.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function SoportePage() {
  const { user } = useAuthStore()
  const router   = useRouter()

  const [conversations, setConversations] = useState<any[]>([])
  const [activeConv, setActiveConv]       = useState<string | null>(null)
  const [messages, setMessages]           = useState<any[]>([])
  const [text, setText]                   = useState('')
  const [sending, setSending]             = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const userEmail = user?.email?.toLowerCase().trim() || ''

  // Redirigir si no es admin de soporte
  useEffect(() => {
    if (user && userEmail !== SUPPORT_ADMIN) router.push('/dashboard')
  }, [user, userEmail, router])

  // ── Escuchar todas las conversaciones ───────────────────────────────────
  useEffect(() => {
    if (userEmail !== SUPPORT_ADMIN) return
    const unsub = onSnapshot(collection(db, 'support_chats'), snap => {
      const convs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.lastAt?.toDate?.()?.getTime() || 0) - (a.lastAt?.toDate?.()?.getTime() || 0))
      setConversations(convs)
    })
    return () => unsub()
  }, [userEmail])

  // ── Escuchar mensajes de la conversación activa ─────────────────────────
  useEffect(() => {
    if (!activeConv) return
    let fallback: (() => void) | null = null
    const convEmail = activeConv.replace(/_/g, '.')
    const q = query(
      collection(db, 'support_messages'),
      where('conversationId', '==', convEmail),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q,
      snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      _err => {
        const q2 = query(collection(db, 'support_messages'), where('conversationId', '==', convEmail))
        fallback = onSnapshot(q2, snap2 => {
          const msgs = snap2.docs.map(d => ({ id: d.id, ...d.data() } as any))
            .sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0))
          setMessages(msgs)
        })
      }
    )
    // Marcar como leído
    setDoc(doc(db, 'support_chats', activeConv), { unreadAdmin: false }, { merge: true })
    return () => { unsub(); fallback?.() }
  }, [activeConv])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Responder ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || sending || !activeConv) return
    setSending(true)
    try {
      const msg = text.trim()
      const convEmail = activeConv.replace(/_/g, '.')
      await addDoc(collection(db, 'support_messages'), {
        conversationId: convEmail,
        userEmail: SUPPORT_ADMIN,
        userName: 'Soporte',
        text: msg,
        fromAdmin: true,
        createdAt: Timestamp.now(),
      })
      await setDoc(doc(db, 'support_chats', activeConv), {
        lastMessage: `Soporte: ${msg}`,
        lastAt: Timestamp.now(),
        unreadAdmin: false,
      }, { merge: true })
      setText('')
    } catch { alert('Error al enviar') }
    finally { setSending(false) }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const selectConv = (id: string) => {
    setActiveConv(id)
    setMobileShowChat(true)
  }

  const activeData = conversations.find(c => c.id === activeConv)

  if (userEmail !== SUPPORT_ADMIN) return null

  return (
    <div className="flex h-full overflow-hidden bg-[#F8FAFC]">

      {/* ── PANEL IZQUIERDO: Lista de conversaciones ─────────────────────── */}
      <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'} md:flex w-full md:w-72 lg:w-80 flex-col bg-white border-r border-gray-100 shrink-0`}>
        {/* Header */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center">
              <Inbox size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-black text-gray-900 text-base">Soporte</h1>
              <p className="text-[11px] text-gray-400">Inbox de UpgradeDigital</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500">{conversations.length} conversaciones</span>
            {conversations.filter((c: any) => c.unreadAdmin).length > 0 && (
              <span className="bg-teal-100 text-teal-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                {conversations.filter((c: any) => c.unreadAdmin).length} nuevas
              </span>
            )}
          </div>
        </div>

        {/* Conversaciones */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <MessageCircle size={32} className="text-gray-200 mb-3" />
              <p className="text-sm font-bold text-gray-400">Sin mensajes aún</p>
              <p className="text-xs text-gray-300 mt-1">Los usuarios te escribirán aquí</p>
            </div>
          ) : (
            conversations.map((conv: any) => (
              <button key={conv.id} onClick={() => selectConv(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 text-left transition-colors ${
                  activeConv === conv.id ? 'bg-teal-50 border-l-2 border-l-teal-500' : 'hover:bg-gray-50'
                }`}>
                <div className={`w-10 h-10 rounded-full ${avatarColor(conv.userEmail || '')} flex items-center justify-center text-white text-xs font-black shrink-0`}>
                  {getInitials(conv.userName || nameFromEmail(conv.userEmail || ''))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {conv.userName || nameFromEmail(conv.userEmail || '')}
                    </p>
                    <span className="text-[9px] text-gray-400 shrink-0">{formatTime(conv.lastAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[11px] text-gray-400 truncate">{conv.lastMessage}</p>
                    {conv.unreadAdmin && (
                      <span className="w-2 h-2 bg-teal-500 rounded-full shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-300 truncate mt-0.5">{conv.userEmail}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── PANEL DERECHO: Conversación activa ──────────────────────────── */}
      <div className={`${!mobileShowChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0 overflow-hidden`}>
        {!activeConv ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 bg-teal-50 rounded-3xl flex items-center justify-center mb-4">
              <MessageCircle size={30} className="text-teal-300" />
            </div>
            <h2 className="font-black text-gray-700 text-lg">Selecciona una conversación</h2>
            <p className="text-gray-400 text-sm mt-2 max-w-xs">
              Elige un usuario de la lista para ver su conversación y responder
            </p>
          </div>
        ) : (
          <>
            {/* Header conversación */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 shrink-0 flex items-center gap-3 shadow-sm">
              <button onClick={() => { setMobileShowChat(false); setActiveConv(null) }}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <ArrowLeft size={18} />
              </button>
              <div className={`w-9 h-9 rounded-full ${avatarColor(activeData?.userEmail || '')} flex items-center justify-center text-white text-xs font-black shrink-0`}>
                {getInitials(activeData?.userName || nameFromEmail(activeData?.userEmail || ''))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-900 text-sm truncate">
                  {activeData?.userName || nameFromEmail(activeData?.userEmail || '')}
                </p>
                <p className="text-[11px] text-gray-400 truncate">{activeData?.userEmail}</p>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#F8FAFC]">
              {messages.map(msg => {
                const isAdmin = msg.fromAdmin
                return (
                  <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                    {!isAdmin && (
                      <p className="text-[9px] font-bold text-gray-400 px-1 mb-0.5">
                        {msg.userName || nameFromEmail(msg.userEmail)}
                      </p>
                    )}
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isAdmin
                        ? 'bg-teal-600 text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-gray-300 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input respuesta */}
            <div className="bg-white border-t border-gray-100 p-3 shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-100 transition-all">
                <div className="w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0 mb-0.5">
                  S
                </div>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={`Responder a ${activeData?.userName || 'usuario'}...`}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none leading-relaxed"
                  style={{ minHeight: '24px', maxHeight: '120px' }}
                />
                <button onClick={handleSend} disabled={!text.trim() || sending}
                  className="w-9 h-9 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-all shrink-0 mb-0.5">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-300 mt-1.5 px-1">Enter para enviar · Shift+Enter para nueva línea</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
