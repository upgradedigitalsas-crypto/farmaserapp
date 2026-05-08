'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { db } from '@/lib/firebase'
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, Timestamp, doc, setDoc,
} from 'firebase/firestore'
import { Zap, X, Send, Loader2, MessageCircle, ChevronDown } from 'lucide-react'

export const SUPPORT_ADMIN = 'upgradedigitalsas@gmail.com'

function formatTime(ts: any) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export default function SupportWidget() {
  const pathname  = usePathname()
  const { user }  = useAuthStore()
  const [isOpen, setIsOpen]   = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText]       = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread]   = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const userEmail = user?.email?.toLowerCase().trim() || ''
  const userName  = user?.name || userEmail.split('@')[0].replace('.farmaser', '')

  // No mostrar para el admin de soporte ni en páginas especiales
  if (!user || userEmail === SUPPORT_ADMIN || pathname === '/login' || pathname === '/soporte') return null

  // ── Mensajes del usuario ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !userEmail) return
    let fallback: (() => void) | null = null
    const q = query(
      collection(db, 'support_messages'),
      where('conversationId', '==', userEmail),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q,
      snap => { setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setUnread(0) },
      _err => {
        const q2 = query(collection(db, 'support_messages'), where('conversationId', '==', userEmail))
        fallback = onSnapshot(q2, snap2 => {
          const msgs = snap2.docs.map(d => ({ id: d.id, ...d.data() } as any))
            .sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0))
          setMessages(msgs); setUnread(0)
        })
      }
    )
    return () => { unsub(); fallback?.() }
  }, [isOpen, userEmail])

  // ── Contador no leídos (respuestas del admin) ───────────────────────────
  useEffect(() => {
    if (isOpen || !userEmail) return
    const q = query(
      collection(db, 'support_messages'),
      where('conversationId', '==', userEmail),
      where('fromAdmin', '==', true)
    )
    const unsub = onSnapshot(q, snap => {
      const lastSeen = parseInt(localStorage.getItem('support_seen') || '0')
      const count = snap.docs.filter(d => {
        const ts = d.data().createdAt?.toDate?.()?.getTime() || 0
        return ts > lastSeen
      }).length
      setUnread(count)
    }, () => {})
    return () => unsub()
  }, [isOpen, userEmail])

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      localStorage.setItem('support_seen', Date.now().toString())
    }
  }, [messages, isOpen])

  // ── Enviar mensaje ──────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const msg = text.trim()
      await addDoc(collection(db, 'support_messages'), {
        conversationId: userEmail,
        userEmail, userName,
        text: msg, fromAdmin: false,
        createdAt: Timestamp.now(),
      })
      await setDoc(doc(db, 'support_chats', userEmail.replace(/\./g, '_')), {
        userEmail, userName,
        lastMessage: msg,
        lastAt: Timestamp.now(),
        unreadAdmin: true,
      }, { merge: true })
      setText('')
    } catch { alert('Error al enviar') }
    finally { setSending(false) }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── RENDER ──────────────────────────────────────────────────────────────
  const Header = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5 px-4 flex items-center gap-3 shrink-0" style={{ paddingTop: mobile ? '2.5rem' : '0.75rem', paddingBottom: '0.75rem' }}>
      <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-teal-700/30">
        <Zap size={15} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white tracking-tight">Soporte Técnico</p>
        <p className="text-[10px] text-slate-400 font-medium">UpgradeDigital · responde pronto 🟢</p>
      </div>
      <button onClick={() => setIsOpen(false)}
        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
        {mobile ? <ChevronDown size={20} /> : <X size={16} />}
      </button>
    </div>
  )

  const MessageArea = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center mb-3">
            <MessageCircle size={22} className="text-teal-400" />
          </div>
          <p className="text-xs font-bold text-gray-600">¿Necesitas ayuda?</p>
          <p className="text-[11px] text-gray-400 mt-1 max-w-[160px]">Escríbenos y te respondemos lo antes posible</p>
        </div>
      ) : (
        messages.map(msg => {
          const isMe = !msg.fromAdmin
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                isMe
                  ? 'bg-teal-600 text-white rounded-tr-sm'
                  : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
              <span className="text-[9px] text-gray-300 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
            </div>
          )
        })
      )}
      <div ref={bottomRef} />
    </div>
  )

  const InputArea = () => (
    <div className="bg-white border-t border-gray-100 p-2.5 shrink-0">
      <div className="flex items-end gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-100 transition-all">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Escribe tu consulta..."
          rows={1}
          className="flex-1 bg-transparent text-xs text-gray-800 placeholder-gray-400 resize-none outline-none leading-relaxed"
          style={{ minHeight: '20px', maxHeight: '80px' }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          className="w-7 h-7 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 text-white rounded-lg flex items-center justify-center transition-all shrink-0">
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Botón flotante ─────────────────────────────────────────────── */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-50 w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-600 hover:from-teal-500 hover:to-emerald-700 active:scale-95 text-white rounded-2xl shadow-xl shadow-teal-600/40 flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl hover:shadow-teal-500/50"
          aria-label="Soporte técnico">
          <Zap size={20} className="drop-shadow-sm" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg animate-bounce">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* ── Popup desktop ──────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 hidden md:flex flex-col w-[340px] h-[460px] bg-white rounded-3xl shadow-2xl shadow-black/20 border border-gray-100 overflow-hidden">
          <Header />
          <MessageArea />
          <InputArea />
        </div>
      )}

      {/* ── Full screen mobile ─────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-gray-50">
          <Header mobile />
          <MessageArea />
          <InputArea />
        </div>
      )}
    </>
  )
}
