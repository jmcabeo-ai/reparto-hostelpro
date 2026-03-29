import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Filter, Edit3, Trash2 } from 'lucide-react'
import { useOperations } from '../hooks/useOperations'
import { formatEUR, formatDate } from '../lib/profit'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import type { OperationStatus } from '../types'

interface Props {
  onNavigate: (page: string, id?: string) => void
}

const STATUS_TABS: { key: OperationStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendiente' },
  { key: 'sold', label: 'Vendida' },
  { key: 'settled', label: 'Liquidada' },
]

export default function OperationsPage({ onNavigate }: Props) {
  const { operations, loading, reload } = useOperations()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OperationStatus | 'all'>('all')

  const filtered = operations.filter(op => {
    if (statusFilter !== 'all' && op.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return op.client_name.toLowerCase().includes(q) || op.machine_description.toLowerCase().includes(q)
    }
    return true
  })

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta operación?')) return
    await supabase.from('hp_operations').delete().eq('id', id)
    await supabase.from('hp_operation_costs').delete().eq('operation_id', id)
    toast.success('Operación eliminada')
    reload()
  }

  return (
    <div className="px-4 py-4 sm:px-8 lg:px-14 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operaciones</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{operations.length} operaciones registradas</p>
        </div>
        <motion.button
          onClick={() => onNavigate('new-operation')}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="btn-primary hidden sm:flex items-center gap-2"
        >
          <Plus size={16} /> Nueva
        </motion.button>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#334155' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente o máquina..."
            className="hp-input pl-9"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 glass rounded-xl p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                statusFilter === tab.key ? 'text-white' : ''
              }`}
              style={statusFilter === tab.key
                ? { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' }
                : { color: '#64748b' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* List */}
      <div className="space-y-2">
        <AnimatePresence>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl shimmer" />
            ))
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Filter size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-sm" style={{ color: '#64748b' }}>
                {search || statusFilter !== 'all' ? 'Sin resultados para esos filtros' : 'Sin operaciones aún. ¡Crea la primera!'}
              </p>
            </motion.div>
          ) : (
            filtered.map((op, i) => (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-2xl p-5 card-hover flex items-center gap-4 group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{
                    background: op.status === 'pending'
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(217,119,6,0.3))'
                      : op.status === 'sold'
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.3))'
                      : 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(124,58,237,0.3))'
                  }}>
                  {op.client_name[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-white">{op.client_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full badge-${op.status}`}>
                      {op.status === 'pending' ? 'Pendiente' : op.status === 'sold' ? 'Vendida' : 'Liquidada'}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: '#64748b' }}>{op.machine_description}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#334155' }}>{formatDate(op.created_at)}</p>
                </div>

                {/* Financials */}
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <div className="text-xs" style={{ color: '#64748b' }}>Compra</div>
                  <div className="text-sm font-medium text-white">{formatEUR(op.purchase_price)}</div>
                  {op.sale_price != null && (
                    <>
                      <div className="text-xs mt-1" style={{ color: '#64748b' }}>Venta</div>
                      <div className="text-sm font-medium text-white">{formatEUR(op.sale_price)}</div>
                    </>
                  )}
                </div>

                {op.profit_net != null && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs" style={{ color: '#64748b' }}>Beneficio</div>
                    <div className="text-base font-bold" style={{ color: op.profit_net >= 0 ? '#10b981' : '#ef4444' }}>
                      {formatEUR(op.profit_net)}
                    </div>
                    <div className="text-xs" style={{ color: '#64748b' }}>{formatEUR(op.partner_share)} c/u</div>
                  </div>
                )}

                {/* Actions — always visible on mobile, hover on desktop */}
                <div className="flex items-center gap-2 flex-shrink-0 lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => onNavigate('edit-operation', op.id)}
                    className="p-3 rounded-xl transition-colors"
                    style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}
                  >
                    <Edit3 size={18} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleDelete(op.id)}
                    className="p-3 rounded-xl transition-colors"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* FAB "+" para móvil — siempre visible */}
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
