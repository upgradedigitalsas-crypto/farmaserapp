'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore, TEAM_MAPPING } from '@/lib/store'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, limit } from 'firebase/firestore'
import { MessageSquare, X, Send, Hash, Loader2, Smile, ImageIcon } from 'lucide-react'
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CHANNEL_MANAGER: Record<string, string> = {
  'equipo-leidys':  'lcontreras.farmaser@gmail.com',
  'equipo-luis':    'langulo.farmaser@gmail.com',
  'equipo-yuliana': 'ypelaez.farmaser@gmail.com',
}
const CHANNEL_LABELS: Record<string, string> = {
  'general':        'General',
  'gerentes':       'Gerentes',
  'equipo-leidys':  'Equipo Leidys',
  'equipo-luis':    'Equipo Luis Carlos',
  'equipo-yuliana': 'Equipo Yuliana',
}
const ADMIN_EMAIL = 'entrenamientofarmaser@gmail.com'
const MANAGER_EMAILS = Object.values(CHANNEL_MANAGER)

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
const AVATAR_COLORS = ['bg-blue-500','bg-orange-500','bg-green-500','bg-purple-500','bg-pink-500','bg-teal-500','bg-red-500','bg-indigo-500']
function avatarColor(email: string) {
  return AVATAR_COLORS[email.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [isOpen, setIsOpen]           = useState(false)
  const [activeChannel, setActiveChannel] = useState('general')
  const [messages, setMessages]       = useState<any[]>([])
  const [text, setText]               = useState('')
  const [sending, setSending]         = useState(false)
  const [loading, setLoading]         = useState(false)
  const [unread, setUnread]             = useState(0)
  const [showEmoji, setShowEmoji]       = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  const userEmail = user?.email?.toLowerCase().trim() || ''
  const userName  = user?.name || nameFromEmail(userEmail)
  const isAdmin   = user?.role === 'admin' || userEmail === ADMIN_EMAIL

  // ── Canales accesibles ───────────────────────────────────────────────────
  const isManager = MANAGER_EMAILS.includes(userEmail)

  const accessibleChannels = useMemo(() => {
    if (isAdmin) return Object.keys(CHANNEL_LABELS)
    const channels = ['general']
    // Admin y gerentes ven el canal privado de dirección
    if (isManager) {
      channels.push('gerentes')
      // Gerente también ve su canal de equipo
      const direct = Object.entries(CHANNEL_MANAGER).find(([, managerEmail]) => managerEmail === userEmail)
      if (direct) channels.push(direct[0])
    } else {
      // Visitador → busca su canal de equipo
      for (const [channelKey, managerEmail] of Object.entries(CHANNEL_MANAGER)) {
        if ((TEAM_MAPPING[managerEmail] || []).includes(userEmail)) {
          channels.push(channelKey)
          break
        }
      }
    }
    return channels
  }, [userEmail, isAdmin, isManager])

  // ── Mensajes cuando está abierto (con fallback sin índice) ──────────────
  useEffect(() => {
    if (!isOpen || !user) return
    setLoading(true)
    let fallbackUnsub: (() => void) | null = null

    const q = query(
      collection(db, 'chat_messages'),
      where('channel', '==', activeChannel),
      orderBy('createdAt', 'asc'),
      limit(60)
    )
    const unsub = onSnapshot(
      q,
      snap => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
        localStorage.setItem(`chat_seen_${activeChannel}`, Date.now().toString())
        if (activeChannel === 'general') setUnread(0)
      },
      _err => {
        const q2 = query(collection(db, 'chat_messages'), where('channel', '==', activeChannel), limit(60))
        fallbackUnsub = onSnapshot(q2, snap2 => {
          const msgs = snap2.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .sort((a: any, b: any) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0))
          setMessages(msgs)
          setLoading(false)
          localStorage.setItem(`chat_seen_${activeChannel}`, Date.now().toString())
          if (activeChannel === 'general') setUnread(0)
        })
      }
    )
    return () => { unsub(); fallbackUnsub?.() }
  }, [isOpen, activeChannel, user])

  // ── Contador de no leídos cuando cerrado (con fallback) ─────────────────
  useEffect(() => {
    if (isOpen || !user) return
    let fallbackUnsub: (() => void) | null = null

    const countUnread = (docs: any[]) => {
      const lastSeen = parseInt(localStorage.getItem('chat_seen_general') || '0')
      return docs.filter(d => {
        if (d.userEmail === userEmail) return false
        return (d.createdAt?.toDate?.()?.getTime() || 0) > lastSeen
      }).length
    }

    const q = query(collection(db, 'chat_messages'), where('channel','==','general'), orderBy('createdAt','asc'), limit(20))
    const unsub = onSnapshot(
      q,
      snap => setUnread(countUnread(snap.docs.map(d => d.data()))),
      _err => {
        const q2 = query(collection(db, 'chat_messages'), where('channel','==','general'), limit(20))
        fallbackUnsub = onSnapshot(q2, snap2 => setUnread(countUnread(snap2.docs.map(d => d.data()))))
      }
    )
    return () => { unsub(); fallbackUnsub?.() }
  }, [isOpen, userEmail, user])

  // ── Scroll al último mensaje ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

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
    } catch { alert('Error al enviar') }
    finally { setSending(false) }
  }
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText(prev => prev + emojiData.emoji)
    setShowEmoji(false)
  }

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Máximo 5 MB'); return }
    setUploadingImg(true)
    try {
      const storageRef = ref(storage, `chat_images/${activeChannel}/${Date.now()}_${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await addDoc(collection(db, 'chat_messages'), {
        channel: activeChannel, userEmail, userName,
        text: text.trim() || '', imageUrl: url,
        createdAt: Timestamp.now(),
      })
      setText('')
    } catch { alert('Error al subir imagen') }
    finally {
      setUploadingImg(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── No renderizar en login / chat / sin usuario ──────────────────────────
  if (!user || pathname === '/chat' || pathname === '/login' || pathname === '/') return null

  // ── MENSAJES helpers ─────────────────────────────────────────────────────
  const MessagesList = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="animate-spin text-blue-500" size={24} />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Hash size={22} className="text-gray-200 mb-2" />
          <p className="text-xs font-bold text-gray-400">Sin mensajes aún</p>
          <p className="text-[10px] text-gray-300 mt-0.5">Sé el primero en escribir</p>
        </div>
      ) : (
        <>
          {messages.map((msg, i) => {
            const prev = i > 0 ? messages[i - 1] : null
            const isSameUser = prev?.userEmail === msg.userEmail
            const isMe = msg.userEmail === userEmail
            return (
              <div key={msg.id} className={`flex gap-2 ${isSameUser ? 'mt-0.5' : 'mt-2.5'} ${isMe ? 'flex-row-reverse' : ''}`}>
                {!isSameUser ? (
                  <div className={`w-7 h-7 rounded-full ${avatarColor(msg.userEmail)} flex items-center justify-center text-white text-[9px] font-black shrink-0 mt-0.5`}>
                    {getInitials(msg.userName || nameFromEmail(msg.userEmail))}
                  </div>
                ) : <div className="w-7 shrink-0" />}
                <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isSameUser && (
                    <div className={`flex items-baseline gap-1.5 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] font-black text-gray-700">{msg.userName || nameFromEmail(msg.userEmail)}</span>
                      <span className="text-[9px] text-gray-400">{formatTime(msg.createdAt)}</span>
                    </div>
                  )}
                  <div className={`rounded-xl text-xs leading-relaxed overflow-hidden ${
                    isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                  }`}>
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="imagen"
                        className="max-w-[200px] w-full cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(msg.imageUrl, '_blank')} />
                    )}
                    {msg.text && <p className="px-3 py-1.5">{msg.text}</p>}
                  </div>
                  {isSameUser && <span className="text-[9px] text-gray-300 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </>
      )}
    </>
  )

  const InputBar = () => (
    <div className="bg-white border-t border-gray-100 p-2.5 shrink-0 relative">
      {/* Emoji Picker */}
      {showEmoji && (
        <div className="absolute bottom-full right-2 mb-1 z-50 shadow-2xl rounded-2xl overflow-hidden">
          <EmojiPicker
            theme={Theme.LIGHT}
            onEmojiClick={handleEmojiClick}
            width={300}
            height={340}
            searchPlaceholder="Buscar..."
          />
        </div>
      )}
      <div className="flex items-end gap-1.5 bg-gray-50 rounded-xl px-2.5 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
        {/* Imagen */}
        <button onClick={() => fileRef.current?.click()} disabled={uploadingImg}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors shrink-0 rounded-lg hover:bg-blue-50">
          {uploadingImg ? <Loader2 size={14} className="animate-spin text-blue-500" /> : <ImageIcon size={14} />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Mensaje en #${CHANNEL_LABELS[activeChannel]}...`}
          rows={1}
          className="flex-1 bg-transparent text-xs text-gray-800 placeholder-gray-400 resize-none outline-none font-medium leading-relaxed max-h-20"
          style={{ minHeight: '20px' }}
        />

        {/* Emoji */}
        <button onClick={() => setShowEmoji(!showEmoji)}
          className={`w-7 h-7 flex items-center justify-center transition-colors shrink-0 rounded-lg ${showEmoji ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}>
          <Smile size={14} />
        </button>

        <button onClick={handleSend} disabled={!text.trim() || sending}
          className="w-7 h-7 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-lg flex items-center justify-center transition-all shrink-0">
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── BOTÓN FLOTANTE ──────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center transition-all hover:scale-110"
          aria-label="Abrir chat"
        >
          <MessageSquare size={24} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg animate-bounce">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* ── POPUP DESKTOP ───────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 hidden md:flex flex-col w-[380px] h-[540px] bg-white rounded-3xl shadow-2xl shadow-black/20 border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-[#0F172A] px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <MessageSquare size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">Chat Interno</p>
              <p className="text-[10px] text-gray-400">#{CHANNEL_LABELS[activeChannel]}</p>
            </div>
            <button onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
              <X size={16} />
            </button>
          </div>

          {/* Tabs de canales */}
          {accessibleChannels.length > 1 && (
            <div className="flex gap-1 px-2 pt-2 pb-1.5 bg-[#1E293B] overflow-x-auto" style={{scrollbarWidth:'none'}}>
              {accessibleChannels.map(ch => (
                <button key={ch} onClick={() => setActiveChannel(ch)}
                  className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    activeChannel === ch ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}>
                  <Hash size={10} />{CHANNEL_LABELS[ch]}
                </button>
              ))}
            </div>
          )}

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-3 bg-[#F8FAFC]">
            <MessagesList />
          </div>

          <InputBar />
        </div>
      )}

      {/* ── POPUP MOBILE (pantalla completa) ────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-[#F8FAFC]">
          {/* Header */}
          <div className="bg-[#0F172A] px-4 pt-10 pb-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <MessageSquare size={15} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white">Chat Interno</p>
              <p className="text-[10px] text-gray-400">Farmaser</p>
            </div>
            <button onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Tabs de canales */}
          <div className="flex gap-1 px-2 pt-2 pb-2 bg-[#0F172A] overflow-x-auto" style={{scrollbarWidth:'none'}}>
            {accessibleChannels.map(ch => (
              <button key={ch} onClick={() => setActiveChannel(ch)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeChannel === ch ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}>
                <Hash size={11} />{CHANNEL_LABELS[ch]}
              </button>
            ))}
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <MessagesList />
          </div>

          <InputBar />
        </div>
      )}
    </>
  )
}
