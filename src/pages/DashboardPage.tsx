import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { TrendingUp, Clock, CheckCircle, Euro, Plus, ArrowRight, Calendar } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { formatEUR, formatDate } from '../lib/profit'
import AnimatedNumber from '../components/AnimatedNumber'
import type { Operation } from '../types'

type Filter = 'week' | 'month' | 'quarter' | 'all' | 'custom'

interface Props {
  onNavigate: (page: string, operationId?: string) => void
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'quarter', label: 'Últimos 3M' },
  { key: 'custom', label: 'Personalizado' },
]

function getFromDate(filter: Filter): string | null {
  const today = new Date()
  if (filter === 'week') {
    const d = new Date(today); d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  }
  if (filter === 'month') {
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  }
  if (filter === 'quarter') {
    const d = new Date(today); d.setMonth(d.getMonth() - 3)
    return d.toISOString().slice(0, 10)
  }
  return null
}

export default function DashboardPage({ onNavigate }: Props) {
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    supabase.from('hp_operations').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Error cargando operaciones:', error.message)
        setOperations(data ?? [])
        setLoading(false)
      })
  }, [])

  // Date range
  const from = filter === 'custom' ? (customFrom || null) : getFromDate(filter)
  const to = filter === 'custom' ? (customTo || null) : null

  function inRange(date: string | null | undefined, fallback: string): boolean {
    const d = (date ?? fallback).slice(0, 10)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }

  const pending = operations.filter(o => o.status === 'pending')
  const allClosed = operations.filter(o => o.status === 'sold' || o.status === 'settled')

  // Filtered closed ops — sale_date preferido, fallback a updated_at
  const closed = filter === 'all'
    ? allClosed
    : allClosed.filter(o => inRange(o.sale_date, o.updated_at))

  const totalProfit = closed.reduce((s, o) => s + (o.profit_net ?? 0), 0)
  const totalShare = totalProfit / 2
  const pendingCapital = pending.reduce((s, o) => s + o.purchase_price, 0)

  // Chart — group filtered closed ops by month
  const chartData = (() => {
    const byMonth: Record<string, number> = {}
    closed.forEach(op => {
      if (op.profit_net == null) return
      const key = (op.sale_date ?? op.updated_at).slice(0, 7)
      byMonth[key] = (byMonth[key] ?? 0) + op.profit_net
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, profit]) => ({
        month: month.slice(5) + '/' + month.slice(2, 4),
        profit: +profit.toFixed(2),
      }))
  })()

  const cards = [
    {
      label: 'Beneficio total neto',
      value: totalProfit,
      icon: Euro,
      color: '#10b981',
      grad: 'linear-gradient(135deg, #10b981, #059669)',
      suffix: '',
    },
    {
      label: 'Parte por socio',
      value: totalShare,
      icon: TrendingUp,
      color: '#3b82f6',
      grad: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      suffix: ' c/u',
    },
    {
      label: 'Capital invertido',
      value: pendingCapital,
      icon: Clock,
      color: '#f59e0b',
      grad: 'linear-gradient(135deg, #f59e0b, #d97706)',
      sub: `${pending.length} máq. pendientes`,
    },
    {
      label: 'Operaciones cerradas',
      value: closed.length,
      icon: CheckCircle,
      color: '#8b5cf6',
      grad: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      currency: false,
    },
  ]

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4 },
  })

  return (
    <div className="px-5 py-6 pb-28 sm:px-8 lg:px-14 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div {...fadeUp()} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Panel principal</h1>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Resumen de operaciones y beneficios</p>
        </div>
        <motion.button
          onClick={() => onNavigate('new-operation')}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="btn-primary hidden sm:flex items-center gap-1.5 text-sm py-2 px-4"
        >
          <Plus size={15} /> Nueva operación
        </motion.button>
      </motion.div>

      {/* Filters */}
      <motion.div {...fadeUp(0.05)} className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200"
              style={filter === f.key
                ? { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(59,130,246,0.1)' }}
            >
              {f.key === 'custom' ? <span className="flex items-center gap-1"><Calendar size={10} />{f.label}</span> : f.label}
            </button>
          ))}
        </div>

        {filter === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-wrap gap-3"
          >
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: '#64748b' }}>Desde</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="hp-input py-1.5 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: '#64748b' }}>Hasta</label>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="hp-input py-1.5 text-xs w-36"
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {cards.map((card, i) => {
          const Icon = card.icon
          const isCurrency = card.currency !== false
          return (
            <motion.div
              key={card.label}
              {...fadeUp(0.05 * i)}
              className="glass rounded-2xl p-4 card-hover relative overflow-hidden"
            >
              {/* Color accent strip at top */}
              <div className="absolute top-0 left-4 right-4 h-0.5 rounded-full opacity-60"
                style={{ background: card.grad }} />
              <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-8 blur-2xl"
                style={{ background: card.color }} />
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${card.color}18`, border: `1px solid ${card.color}25` }}>
                  <Icon size={15} style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-xs mb-1" style={{ color: '#475569' }}>{card.label}</div>
              <div className="text-2xl font-black text-white leading-tight">
                {loading ? (
                  <div className="h-8 w-20 rounded-lg shimmer" />
                ) : isCurrency ? (
                  <AnimatedNumber value={card.value} currency />
                ) : (
                  <span>{card.value}</span>
                )}
              </div>
              {card.suffix && <span className="text-xs font-medium" style={{ color: card.color }}>{card.suffix}</span>}
              {'sub' in card && card.sub && (
                <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{card.sub}</div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Chart + Recent */}
      <div className="grid lg:grid-cols-5 gap-2.5">
        {/* Chart */}
        <motion.div {...fadeUp(0.2)} className="lg:col-span-3 glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white text-sm">Beneficio por mes</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              {filter === 'all' ? 'Todo el historial' : FILTERS.find(f => f.key === filter)?.label}
            </span>
          </div>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-sm" style={{ color: '#334155' }}>
              Sin datos de ventas en este período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} width={45} />
                <Tooltip
                  contentStyle={{ background: '#0d1424', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#60a5fa' }}
                  formatter={(v) => [formatEUR(v as number), 'Beneficio']}
                />
                <Area type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2.5} fill="url(#profitGrad)" dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Recent operations */}
        <motion.div {...fadeUp(0.25)} className="lg:col-span-2 glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white text-sm">Recientes</h2>
            <button onClick={() => onNavigate('operations')} className="text-xs flex items-center gap-1 transition-colors" style={{ color: '#3b82f6' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3b82f6')}>
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-1">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 rounded-xl shimmer" />
              ))
            ) : operations.slice(0, 5).length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: '#334155' }}>
                Sin operaciones aún
              </div>
            ) : (
              operations.slice(0, 5).map(op => (
                <motion.button
                  key={op.id}
                  onClick={() => onNavigate('edit-operation', op.id)}
                  whileHover={{ x: 2 }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                    style={{ background: op.status === 'pending' ? 'rgba(245,158,11,0.25)' : op.status === 'sold' ? 'rgba(16,185,129,0.25)' : 'rgba(139,92,246,0.25)' }}>
                    {op.client_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{op.client_name}</div>
                    <div className="text-xs truncate" style={{ color: '#475569', fontSize: '10px' }}>{op.machine_description}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {op.profit_net != null ? (
                      <div className="text-xs font-bold" style={{ color: op.profit_net >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatEUR(op.profit_net)}
                      </div>
                    ) : (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full badge-${op.status}`} style={{ fontSize: '10px' }}>{
                        op.status === 'pending' ? 'Pend.' : 'Vendida'
                      }</span>
                    )}
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Pending ops */}
      {pending.length > 0 && (
        <motion.div {...fadeUp(0.3)} className="glass rounded-2xl p-5">
          <h2 className="font-semibold text-white text-sm mb-4">
            Máquinas pendientes de venta
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full badge-pending">{pending.length}</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pending.map(op => (
              <motion.button
                key={op.id}
                onClick={() => onNavigate('edit-operation', op.id)}
                whileHover={{ y: -2 }}
                className="flex items-start gap-3 p-4 rounded-xl text-left card-hover"
                style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}
              >
                <Clock size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{op.client_name}</div>
                  <div className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{op.machine_description}</div>
                  <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                    Compra: {formatEUR(op.purchase_price)} · {formatDate(op.created_at)}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* FAB "+" para móvil */}
      {createPortal(
        <motion.button
          onClick={() => onNavigate('new-operation')}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          className="sm:hidden"
          style={{
            position: 'fixed',
            bottom: 80,
            left: 16,
            zIndex: 55,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            boxShadow: '0 4px 24px rgba(59,130,246,0.45)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
          }}
        >
          <Plus size={24} />
        </motion.button>,
        document.body
      )}
    </div>
  )
}
