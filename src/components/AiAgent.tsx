import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Bot, Sparkles, Trash2 } from 'lucide-react'
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

1. **Cálculo de beneficios y reparto**: Explica cómo se calcula el beneficio según el escenario de IVA:
   - Compra CON IVA, venta SIN IVA: beneficio = precio venta - precio compra (con IVA incluido)
   - Compra CON IVA, venta CON IVA: beneficio = precio venta neto - precio compra neto (ambos sin IVA)
   - Compra SIN IVA, venta CON IVA: beneficio = precio venta neto - precio compra
   - Compra SIN IVA, venta SIN IVA: beneficio = precio venta - precio compra
   El beneficio siempre se divide al 50% entre los dos socios.

2. **Gestión del panel**: Cómo registrar operaciones, gastos, liquidaciones.

3. **Dudas sobre IVA**: Tipos (21%, 10%, 4%), cuándo se aplica cada uno, diferencia entre precio con y sin IVA.

4. **Balance y deudas**: Quién le debe a quién y cómo calcularlo.

Responde siempre en español, de forma clara y concisa. Si te preguntan por cálculos específicos, muestra los pasos. Sé amigable y profesional.`

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

export default function AiAgent() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      loadHistory()
      setTimeout(() => inputRef.current?.focus(), 300)
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

  return (
    <>
      {/* Floating button — sube en móvil para no tapar la bottom nav */}
      <div className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-40">
        <motion.button
          onClick={() => setOpen(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center glow-blue"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
        >
          <Bot size={24} className="text-white" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full pointer-events-none"
          >
            <div className="absolute w-2 h-2 rounded-full bg-cyan-400"
              style={{ top: '-3px', left: '50%', transform: 'translateX(-50%)' }} />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', zIndex: -1 }}
          />
        </motion.button>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 22 }}
            className="fixed bottom-40 lg:bottom-24 right-4 lg:right-6 z-50 w-[calc(100vw-2rem)] max-w-96 rounded-2xl overflow-hidden glass-strong border flex flex-col"
            style={{
              borderColor: 'rgba(59,130,246,0.2)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(59,130,246,0.15)',
              maxHeight: '520px',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: 'rgba(59,130,246,0.15)', background: 'rgba(15,22,35,0.95)' }}>
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                  <Sparkles size={14} className="text-white" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2"
                    style={{ borderColor: '#0f1623' }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Asistente Hostelpro</div>
                  <div className="text-xs flex items-center gap-1" style={{ color: '#10b981' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    Gemini · En línea
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={clearHistory} title="Limpiar chat"
                  className="p-1.5 rounded-lg transition-colors" style={{ color: '#64748b' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
                  <Trash2 size={14} />
                </button>
                <button onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg transition-colors" style={{ color: '#64748b' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'rgba(8,12,20,0.7)' }}>
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center float"
                    style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <Bot size={28} style={{ color: '#60a5fa' }} />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">¡Hola! Soy tu asistente</p>
                  <p className="text-xs px-4" style={{ color: '#64748b' }}>
                    Pregúntame sobre IVA, beneficios, operaciones o cualquier duda del negocio.
                  </p>
                  <div className="mt-4 space-y-1.5">
                    {[
                      '¿Cómo calculo el beneficio con IVA?',
                      '¿Quién le debe a quién ahora mismo?',
                      '¿Cómo registro un gasto adicional?',
                    ].map(q => (
                      <button key={q} onClick={() => { setInput(q); inputRef.current?.focus() }}
                        className="block w-full text-left text-xs px-3 py-2 rounded-xl transition-colors"
                        style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.14)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}>
                        {q}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                      <Sparkles size={10} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'chat-bubble-user text-white' : 'chat-bubble-ai'}`}
                    style={msg.role === 'assistant' ? { color: '#cbd5e1' } : {}}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                    <Sparkles size={10} className="text-white" />
                  </div>
                  <div className="chat-bubble-ai px-4 py-3 rounded-xl flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 typing-dot" />
                  </div>
                </motion.div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t flex-shrink-0"
              style={{ borderColor: 'rgba(59,130,246,0.1)', background: 'rgba(15,22,35,0.95)' }}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Escribe tu pregunta... (Enter para enviar)"
                  rows={1}
                  className="hp-input flex-1 resize-none text-xs"
                  style={{ minHeight: '36px', maxHeight: '80px' }}
                />
                <motion.button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                >
                  <Send size={14} className="text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
