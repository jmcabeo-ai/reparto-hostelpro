import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Bot, Sparkles, Trash2, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

const SYSTEM_PROMPT = `Eres el asistente de Hostelpro, una empresa de maquinaria de hostelería.
Ayudas a Aitor y Jonathan, los dos socios del negocio, con sus dudas sobre:

1. Cálculo de beneficios y reparto según escenario IVA.
2. Gestión del panel: registrar operaciones, gastos, liquidaciones.
3. Dudas sobre IVA: tipos (21%, 10%, 4%), cuándo aplica cada uno.
4. Balance y deudas: quién le debe a quién.

Responde siempre en español, de forma clara y concisa. Sé amigable y profesional.`

async function callGemini(history: Message[], userMessage: string): Promise<string> {
  const contents = [
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ]
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
    }),
  })
  if (!res.ok) throw new Error(`Gemini error ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sin respuesta'
}

const SUGGESTIONS = [
  '¿Cómo calculo el beneficio con IVA?',
  '¿Quién le debe a quién ahora mismo?',
  '¿Cómo registro un gasto adicional?',
]

export default function AiAgent() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Intercept Android back button when chat is open
  useEffect(() => {
    if (!open) return
    const handlePop = (e: PopStateEvent) => {
      e.preventDefault()
      setOpen(false)
    }
    window.history.pushState({ chatOpen: true }, '')
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [open])

  useEffect(() => {
    if (open) {
      loadHistory()
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function loadHistory() {
    if (!user) return
    const { data } = await supabase
      .from('hp_ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(40)
    if (data) {
      setMessages(data.map(d => ({ id: d.id, role: d.role as 'user' | 'assistant', content: d.content })))
    }
  }

  async function clearHistory() {
    if (!user) return
    await supabase.from('hp_ai_conversations').delete().eq('user_id', user.id)
    setMessages([])
  }

  async function send() {
    if (!input.trim() || loading || !user) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    await supabase.from('hp_ai_conversations').insert({ user_id: user.id, role: 'user', content: userMsg.content })
    try {
      const reply = await callGemini(messages, userMsg.content)
      const aiMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: reply }
      setMessages(prev => [...prev, aiMsg])
      await supabase.from('hp_ai_conversations').insert({ user_id: user.id, role: 'assistant', content: reply })
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: 'Error al conectar con el asistente. Revisa la API key de Gemini.',
      }])
    }
    setLoading(false)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const Header = () => (
    <div
      className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
      style={{ borderColor: 'rgba(59,130,246,0.15)', background: 'rgba(10,15,28,0.98)' }}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
          <Sparkles size={16} className="text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2"
            style={{ borderColor: '#0a0f1c' }} />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Asistente Hostelpro</div>
          <div className="text-xs flex items-center gap-1.5" style={{ color: '#10b981' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Gemini · En línea
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={clearHistory} title="Limpiar chat"
          className="p-2.5 rounded-xl transition-colors" style={{ color: '#64748b' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
          <Trash2 size={18} />
        </button>
        <button onClick={() => setOpen(false)}
          className="p-2.5 rounded-xl transition-colors" style={{ color: '#64748b' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
          <ChevronDown size={22} className="lg:hidden" />
          <X size={20} className="hidden lg:block" />
        </button>
      </div>
    </div>
  )

  const Messages = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: 'rgba(6,10,20,0.9)' }}>
      {messages.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center float"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
              border: '1px solid rgba(59,130,246,0.3)',
            }}>
            <Bot size={28} style={{ color: '#60a5fa' }} />
          </div>
          <p className="text-base font-semibold text-white mb-1">¡Hola! Soy tu asistente</p>
          <p className="text-sm mb-6 px-4" style={{ color: '#64748b' }}>
            Pregúntame sobre IVA, beneficios, operaciones o cualquier duda del negocio.
          </p>
          <div className="space-y-2 px-2">
            {SUGGESTIONS.map(q => (
              <button key={q} onClick={() => { setInput(q); inputRef.current?.focus() }}
                className="block w-full text-left text-sm px-4 py-3 rounded-2xl transition-all active:scale-95"
                style={{
                  background: 'rgba(59,130,246,0.08)',
                  color: '#93c5fd',
                  border: '1px solid rgba(59,130,246,0.18)',
                }}>
                {q}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {messages.map(msg => (
        <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
          {msg.role === 'assistant' && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
              <Sparkles size={12} className="text-white" />
            </div>
          )}
          <div className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'chat-bubble-user text-white' : 'chat-bubble-ai'}`}
            style={msg.role === 'assistant' ? { color: '#cbd5e1' } : {}}>
            {msg.content}
          </div>
        </motion.div>
      ))}

      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <Sparkles size={12} className="text-white" />
          </div>
          <div className="chat-bubble-ai px-4 py-3 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
            <div className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
            <div className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
          </div>
        </motion.div>
      )}
      <div ref={endRef} />
    </div>
  )

  const InputBar = () => (
    <div className="p-3 border-t flex-shrink-0"
      style={{ borderColor: 'rgba(59,130,246,0.1)', background: 'rgba(10,15,28,0.98)' }}>
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Escribe tu pregunta..."
          rows={1}
          className="hp-input flex-1 resize-none text-sm"
          style={{ minHeight: '44px', maxHeight: '100px' }}
        />
        <motion.button
          onClick={send}
          disabled={!input.trim() || loading}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
        >
          <Send size={16} className="text-white" />
        </motion.button>
      </div>
    </div>
  )

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-40">
        <motion.button
          onClick={() => setOpen(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center glow-blue"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
        >
          <Bot size={24} className="text-white" />
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', zIndex: -1 }}
          />
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            {/* ── MOBILE: bottom sheet full-screen ── */}
            <motion.div
              key="mob-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="mob-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-50 flex flex-col lg:hidden"
              style={{
                height: '88dvh',
                borderRadius: '20px 20px 0 0',
                background: 'rgba(10,15,28,0.98)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderBottom: 'none',
              }}
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(100,116,139,0.5)' }} />
              </div>
              <Header />
              <Messages />
              <InputBar />
            </motion.div>

            {/* ── DESKTOP: floating panel ── */}
            <motion.div
              key="desk-panel"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 22 }}
              className="fixed bottom-28 right-8 z-50 hidden lg:flex flex-col glass-strong rounded-2xl overflow-hidden"
              style={{
                width: '400px',
                height: '580px',
                border: '1px solid rgba(59,130,246,0.2)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(59,130,246,0.12)',
              }}
            >
              <Header />
              <Messages />
              <InputBar />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
