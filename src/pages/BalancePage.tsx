import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, ArrowRight, TrendingUp, TrendingDown, Loader2, CheckCircle, X } from 'lucide-react'
import { useBalance } from '../hooks/useBalance'
import { usePartners } from '../hooks/useOperations'
import { formatEUR } from '../lib/profit'
import AnimatedNumber from '../components/AnimatedNumber'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface Props {
  onNavigate: (page: string) => void
}

export default function BalancePage({ onNavigate }: Props) {
  const partners = usePartners()
  const p1 = partners[0]
  const p2 = partners[1]

  const { entries, summary, loading, reload } = useBalance(p1?.id, p2?.id)
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay },
  })

  async function handleLiquidateAll() {
    if (!p1 || !p2 || summary.toSettle <= 0) return
    setSaving(true)
    const payerId = summary.settleDirection === 'jonathan_pays' ? p2.id : p1.id
    const receiverId = summary.settleDirection === 'jonathan_pays' ? p1.id : p2.id
    const payerName = summary.settleDirection === 'jonathan_pays' ? (p2?.name ?? 'Socio 2') : (p1?.name ?? 'Socio 1')
    const receiverName = summary.settleDirection === 'jonathan_pays' ? (p1?.name ?? 'Socio 1') : (p2?.name ?? 'Socio 2')
    const { error } = await supabase.from('hp_settlements').insert({
      paid_by: payerId,
      paid_to: receiverId,
      amount: summary.toSettle,
      notes: 'Liquidación total del balance',
      settlement_date: new Date().toISOString().slice(0, 10),
    })
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    toast.success(`${payerName} → ${receiverName}: ${formatEUR(summary.toSettle)} liquidado`)
    setSaving(false)
    setConfirm(false)
    reload()
  }

  const payerName = summary.settleDirection === 'jonathan_pays' ? (p2?.name ?? 'Socio 2') : (p1?.name ?? 'Socio 1')
  const receiverName = summary.settleDirection === 'jonathan_pays' ? (p1?.name ?? 'Socio 1') : (p2?.name ?? 'Socio 2')

  return (
    <div className="px-5 py-6 pb-28 sm:px-8 lg:px-14 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div {...fadeUp()} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Balance de socios</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Quién le debe qué a quién</p>
        </div>
        <motion.button
          onClick={() => onNavigate('settlements')}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="btn-primary flex items-center gap-2"
        >
          Registrar pago <ArrowRight size={15} />
        </motion.button>
      </motion.div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-1">
        <motion.div {...fadeUp(0.05)} className="glass rounded-2xl p-5 card-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
              <TrendingUp size={18} style={{ color: '#10b981' }} />
            </div>
            <span className="text-sm" style={{ color: '#64748b' }}>Beneficio total</span>
          </div>
          {loading ? <div className="h-8 w-32 shimmer rounded-lg" /> : (
            <div className="text-2xl font-bold text-white">
              <AnimatedNumber value={summary.totalProfit} currency />
            </div>
          )}
          <div className="text-xs mt-1" style={{ color: '#64748b' }}>{formatEUR(summary.totalProfit / 2)} por socio</div>
        </motion.div>

        {[
          { name: p1?.name ?? 'Socio 1', balance: summary.aitorBalance },
          { name: p2?.name ?? 'Socio 2', balance: summary.jonathanBalance },
        ].map((p, i) => (
          <motion.div key={p.name} {...fadeUp(0.1 + i * 0.05)} className="glass rounded-2xl p-5 card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                {p.name[0]}
              </div>
              <span className="text-sm" style={{ color: '#64748b' }}>{p.name}</span>
            </div>
            {loading ? <div className="h-8 w-32 shimmer rounded-lg" /> : (
              <div className="text-2xl font-bold" style={{ color: p.balance >= 0 ? '#10b981' : '#ef4444' }}>
                <AnimatedNumber value={p.balance} currency />
              </div>
            )}
            <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#64748b' }}>
              {p.balance >= 0
                ? <><TrendingUp size={12} style={{ color: '#10b981' }} /> A favor</>
                : <><TrendingDown size={12} style={{ color: '#ef4444' }} /> Debe</>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Settlement banner */}
      {!loading && summary.settleDirection !== 'even' && (
        <motion.div
          {...fadeUp(0.2)}
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.08))', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <Scale size={24} style={{ color: '#3b82f6' }} />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              <span className="gradient-text">{payerName}</span>{' '}
              le debe a{' '}
              <span className="gradient-text">{receiverName}</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Para equilibrar el balance actual</p>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#60a5fa' }}>
            {formatEUR(summary.toSettle)}
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => setConfirm(true)} className="btn-primary text-xs py-2 px-4 whitespace-nowrap">
              Liquidar todo
            </button>
            <button onClick={() => onNavigate('settlements')} className="btn-ghost text-xs py-2 px-4 whitespace-nowrap">
              Pago parcial
            </button>
          </div>
        </motion.div>
      )}

      {!loading && summary.settleDirection === 'even' && summary.totalProfit > 0 && (
        <motion.div
          {...fadeUp(0.2)}
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <CheckCircle size={20} style={{ color: '#10b981' }} />
          <p className="text-sm" style={{ color: '#10b981' }}>El balance está equilibrado — ambos socios están al día.</p>
        </motion.div>
      )}

      {/* Per-operation breakdown */}
      <motion.div {...fadeUp(0.25)} className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,0.08)' }}>
          <h2 className="text-sm font-semibold text-white">Desglose por operación</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Cliente', 'Máquina', `${p1?.name ?? 'S1'} pagó`, `${p2?.name ?? 'S2'} pagó`, `${p1?.name ?? 'S1'} cobró`, `${p2?.name ?? 'S2'} cobró`, 'Beneficio neto', `Parte ${p1?.name ?? 'S1'}`, `Parte ${p2?.name ?? 'S2'}`, 'Estado'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-medium" style={{ color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={10} className="px-5 py-3">
                      <div className="h-6 shimmer rounded" />
                    </td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center" style={{ color: '#334155' }}>
                    Sin operaciones cerradas aún
                  </td>
                </tr>
              ) : (
                entries.map(entry => (
                  <motion.tr
                    key={entry.operationId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t"
                    style={{ borderColor: 'rgba(59,130,246,0.05)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-5 py-3 text-white font-medium">{entry.clientName}</td>
                    <td className="px-5 py-3 max-w-32 truncate" style={{ color: '#94a3b8' }}>{entry.machineDescription}</td>
                    <td className="px-5 py-3" style={{ color: '#ef4444' }}>{formatEUR(entry.aitorPaid)}</td>
                    <td className="px-5 py-3" style={{ color: '#ef4444' }}>{formatEUR(entry.jonathanPaid)}</td>
                    <td className="px-5 py-3" style={{ color: '#10b981' }}>{formatEUR(entry.aitorReceived)}</td>
                    <td className="px-5 py-3" style={{ color: '#10b981' }}>{formatEUR(entry.jonathanReceived)}</td>
                    <td className="px-5 py-3 font-semibold" style={{ color: entry.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                      {formatEUR(entry.netProfit)}
                    </td>
                    <td className="px-5 py-3" style={{ color: '#60a5fa' }}>{formatEUR(entry.aitorShare)}</td>
                    <td className="px-5 py-3" style={{ color: '#60a5fa' }}>{formatEUR(entry.jonathanShare)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full badge-${entry.status}`}>
                        {entry.status === 'sold' ? 'Vendida' : 'Liquidada'}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => !saving && setConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full max-w-sm glass-strong rounded-2xl p-6 space-y-4"
                style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-white">Confirmar liquidación</h2>
                  {!saving && <button onClick={() => setConfirm(false)} style={{ color: '#64748b' }}><X size={18} /></button>}
                </div>
                <p className="text-sm" style={{ color: '#94a3b8' }}>
                  Se registrará un pago de{' '}
                  <span className="text-white font-semibold">{formatEUR(summary.toSettle)}</span>{' '}
                  de <span className="gradient-text font-medium">{payerName}</span>{' '}
                  a <span className="gradient-text font-medium">{receiverName}</span>.
                </p>
                <p className="text-xs" style={{ color: '#475569' }}>
                  Después de esto el balance quedará a cero.
                </p>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setConfirm(false)} disabled={saving} className="btn-ghost flex-1 py-2.5">
                    Cancelar
                  </button>
                  <motion.button
                    onClick={handleLiquidateAll}
                    disabled={saving}
                    whileHover={{ scale: 1.02 }}
                    className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    {saving ? 'Guardando...' : 'Confirmar'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
