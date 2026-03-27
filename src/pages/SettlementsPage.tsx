import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeftRight, Plus, X, Loader2, Calendar, MessageSquare, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePartners } from '../hooks/useOperations'
import { useAuth } from '../contexts/AuthContext'
import { formatEUR, formatDate } from '../lib/profit'
import toast from 'react-hot-toast'
import type { Settlement } from '../types'

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const partners = usePartners()
  useAuth()

  // Form
  const [paidBy, setPaidBy] = useState('')
  const [paidTo, setPaidTo] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('hp_settlements').select('*').order('created_at', { ascending: false })
    setSettlements(data ?? [])
    setLoading(false)
  }

  async function handleSave() {
    if (!paidBy || !paidTo || !amount || paidBy === paidTo) {
      toast.error('Completa todos los campos correctamente')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('hp_settlements').insert({
      paid_by: paidBy,
      paid_to: paidTo,
      amount: parseFloat(amount),
      notes: notes.trim() || null,
      settlement_date: date,
    })
    if (error) { toast.error('Error al guardar pago: ' + error.message); setSaving(false); return }
    toast.success('Pago registrado')
    setShowForm(false)
    setPaidBy(''); setPaidTo(''); setAmount(''); setNotes('')
    setSaving(false)
    load()
  }

  function getPartnerName(id: string) {
    return partners.find(p => p.id === id)?.name ?? id.slice(0, 8)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('hp_settlements').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar: ' + error.message); return }
    toast.success('Pago eliminado')
    load()
  }

  const total = settlements.reduce((s, sett) => s + sett.amount, 0)

  return (
    <div className="px-6 py-6 sm:px-10 lg:px-14 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Liquidaciones</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Historial de pagos entre socios</p>
        </div>
        <motion.button
          onClick={() => setShowForm(true)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Registrar pago
        </motion.button>
      </motion.div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-5 sm:p-7 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))' }}>
          <ArrowLeftRight size={20} style={{ color: '#60a5fa' }} />
        </div>
        <div>
          <div className="text-xs" style={{ color: '#64748b' }}>Total liquidado entre socios</div>
          <div className="text-xl font-bold text-white">{formatEUR(total)}</div>
          <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{settlements.length} pagos registrados</div>
        </div>
      </motion.div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full max-w-md glass-strong rounded-2xl p-6 space-y-4"
                style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-white">Registrar pago</h2>
                  <button onClick={() => setShowForm(false)} style={{ color: '#64748b' }}><X size={18} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>Paga</label>
                    <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="hp-input">
                      <option value="">Seleccionar</option>
                      {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>Recibe</label>
                    <select value={paidTo} onChange={e => setPaidTo(e.target.value)} className="hp-input">
                      <option value="">Seleccionar</option>
                      {partners.filter(p => p.id !== paidBy).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>Importe (€)</label>
                  <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="hp-input" placeholder="0.00" />
                </div>

                <div>
                  <label className="block text-xs mb-1.5 flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                    <Calendar size={12} /> Fecha
                  </label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="hp-input" />
                </div>

                <div>
                  <label className="block text-xs mb-1.5 flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                    <MessageSquare size={12} /> Concepto (opcional)
                  </label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} className="hp-input" placeholder="Ej: Liquidación marzo" />
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-2.5">Cancelar</button>
                  <motion.button
                    onClick={handleSave}
                    disabled={saving}
                    whileHover={{ scale: 1.02 }}
                    className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    {saving ? 'Guardando...' : 'Guardar'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History */}
      <div className="space-y-1">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-2xl shimmer" />)
        ) : settlements.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 glass rounded-2xl">
            <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#64748b' }} />
            <p className="text-sm" style={{ color: '#64748b' }}>Sin pagos registrados aún</p>
          </motion.div>
        ) : (
          settlements.map((sett, i) => (
            <motion.div
              key={sett.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass rounded-2xl p-5 sm:p-7 flex items-center gap-4 card-hover"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <ArrowLeftRight size={16} style={{ color: '#3b82f6' }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">
                  {getPartnerName(sett.paid_by)}{' '}
                  <span style={{ color: '#64748b' }}>pagó a</span>{' '}
                  {getPartnerName(sett.paid_to)}
                </div>
                {sett.notes && (
                  <div className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{sett.notes}</div>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-base font-bold" style={{ color: '#10b981' }}>{formatEUR(sett.amount)}</div>
                <div className="text-xs" style={{ color: '#64748b' }}>{formatDate(sett.settlement_date)}</div>
              </div>
              <button
                onClick={() => handleDelete(sett.id)}
                className="p-2 rounded-xl flex-shrink-0 transition-colors"
                style={{ color: '#475569' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                title="Eliminar"
              >
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
