import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Save, TrendingUp, Info, Loader2, Banknote, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useOperation, usePartners } from '../hooks/useOperations'
import { calculateProfit, formatEUR } from '../lib/profit'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import type { OperationStatus } from '../types'

interface CostRow {
  id: string
  description: string
  amount: string
  vat_included: boolean
  vat_rate: number
  paid_by: string
}

interface PaymentRow {
  id: string
  amount: string
  received_by: string
  payment_date: string
  notes: string
  isExisting?: boolean
}

interface Props {
  operationId?: string
  onBack: () => void
  onSaved: () => void
}

const VAT_RATES = [
  { label: '21%', value: 0.21 },
  { label: '10%', value: 0.10 },
  { label: '4%', value: 0.04 },
  { label: '0%', value: 0 },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className="relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0"
        style={{ background: checked ? '#3b82f6' : '#1e2d45' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </div>
      <span className="text-xs" style={{ color: '#94a3b8' }}>{label}</span>
    </label>
  )
}

export default function OperationFormPage({ operationId, onBack, onSaved }: Props) {
  const { user } = useAuth()
  const { operation, costs: existingCosts, payments: existingPayments, loading } = useOperation(operationId ?? null)
  const partners = usePartners()
  const [saving, setSaving] = useState(false)

  // Form state
  const [clientName, setClientName] = useState('')
  const [machineDesc, setMachineDesc] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<OperationStatus>('pending')

  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseVatIncluded, setPurchaseVatIncluded] = useState(true)
  const [purchaseVatRate, setPurchaseVatRate] = useState(0.21)
  const [purchasePaidBy, setPurchasePaidBy] = useState('')

  const [salePrice, setSalePrice] = useState('')
  const [saleVatIncluded, setSaleVatIncluded] = useState(true)
  const [saleVatRate, setSaleVatRate] = useState(0.21)
  const [saleDate, setSaleDate] = useState('')

  const [costs, setCosts] = useState<CostRow[]>([])
  const [clientPayments, setClientPayments] = useState<PaymentRow[]>([])

  // Load existing data
  useEffect(() => {
    if (!operation) return
    setClientName(operation.client_name)
    setMachineDesc(operation.machine_description)
    setNotes(operation.notes ?? '')
    setStatus(operation.status)
    setPurchasePrice(String(operation.purchase_price))
    setPurchaseVatIncluded(operation.purchase_vat_included)
    setPurchaseVatRate(operation.purchase_vat_rate)
    setPurchasePaidBy(operation.purchase_paid_by ?? '')
    setSalePrice(operation.sale_price != null ? String(operation.sale_price) : '')
    setSaleVatIncluded(operation.sale_vat_included)
    setSaleVatRate(operation.sale_vat_rate)
    setSaleDate(operation.sale_date ?? '')
  }, [operation])

  useEffect(() => {
    if (existingCosts.length > 0) {
      setCosts(existingCosts.map(c => ({
        id: c.id,
        description: c.description,
        amount: String(c.amount),
        vat_included: c.vat_included,
        vat_rate: c.vat_rate,
        paid_by: c.paid_by ?? '',
      })))
    }
  }, [existingCosts])

  useEffect(() => {
    if (existingPayments.length > 0) {
      setClientPayments(existingPayments.map(p => ({
        id: p.id,
        amount: String(p.amount),
        received_by: p.received_by ?? '',
        payment_date: p.payment_date,
        notes: p.notes ?? '',
        isExisting: true,
      })))
    }
  }, [existingPayments])

  // Live profit calculation
  const profitResult = (() => {
    const pp = parseFloat(purchasePrice)
    const sp = parseFloat(salePrice)
    if (!pp || !sp) return null
    return calculateProfit({
      purchasePrice: pp,
      purchaseVatIncluded,
      purchaseVatRate,
      salePrice: sp,
      saleVatIncluded,
      saleVatRate,
      costs: costs.filter(c => c.amount).map(c => ({
        amount: parseFloat(c.amount) || 0,
        vat_included: c.vat_included,
        vat_rate: c.vat_rate,
      })),
    })
  })()

  function addCost() {
    setCosts(prev => [...prev, {
      id: crypto.randomUUID(),
      description: '',
      amount: '',
      vat_included: false,
      vat_rate: 0.21,
      paid_by: '',
    }])
  }

  function removeCost(id: string) {
    setCosts(prev => prev.filter(c => c.id !== id))
  }

  function updateCost(id: string, field: keyof CostRow, value: string | boolean | number) {
    setCosts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  function addPayment() {
    setClientPayments(prev => [...prev, {
      id: crypto.randomUUID(),
      amount: '',
      received_by: '',
      payment_date: new Date().toISOString().slice(0, 10),
      notes: '',
    }])
  }

  function removePayment(id: string) {
    setClientPayments(prev => prev.filter(p => p.id !== id))
  }

  function updatePayment(id: string, field: keyof PaymentRow, value: string) {
    setClientPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const totalCollected = clientPayments
    .filter(p => p.amount)
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)

  async function handleSave() {
    if (!clientName.trim() || !machineDesc.trim() || !purchasePrice) {
      toast.error('Completa los campos obligatorios')
      return
    }
    setSaving(true)

    const profitData = profitResult
    const today = new Date().toISOString().slice(0, 10)
    const effectiveSaleDate = saleDate || ((status === 'sold' || status === 'settled') ? today : null)
    const opData = {
      client_name: clientName.trim(),
      machine_description: machineDesc.trim(),
      notes: notes.trim() || null,
      status,
      purchase_price: parseFloat(purchasePrice),
      purchase_vat_included: purchaseVatIncluded,
      purchase_vat_rate: purchaseVatRate,
      purchase_paid_by: purchasePaidBy || null,
      sale_price: salePrice ? parseFloat(salePrice) : null,
      sale_vat_included: saleVatIncluded,
      sale_vat_rate: saleVatRate,
      sale_date: effectiveSaleDate,
      profit_net: profitData?.netProfit ?? null,
      partner_share: profitData?.partnerShare ?? null,
    }

    let opId = operationId
    if (operationId) {
      const { error } = await supabase.from('hp_operations').update({ ...opData, updated_at: new Date().toISOString() }).eq('id', operationId)
      if (error) { toast.error('Error al guardar operación: ' + error.message); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('hp_operations').insert({ ...opData, created_by: user!.id }).select().single()
      if (error) { toast.error('Error al crear operación: ' + error.message); setSaving(false); return }
      opId = data.id
    }

    // Sync costs
    const { error: costsDelErr } = await supabase.from('hp_operation_costs').delete().eq('operation_id', opId)
    if (costsDelErr) { toast.error('Error al sincronizar gastos: ' + costsDelErr.message); setSaving(false); return }
    const validCosts = costs.filter(c => c.description && c.amount)
    if (validCosts.length > 0) {
      const { error: costsInsErr } = await supabase.from('hp_operation_costs').insert(
        validCosts.map(c => ({
          operation_id: opId,
          description: c.description,
          amount: parseFloat(c.amount),
          vat_included: c.vat_included,
          vat_rate: c.vat_rate,
          paid_by: c.paid_by || null,
        }))
      )
      if (costsInsErr) { toast.error('Error al guardar gastos: ' + costsInsErr.message); setSaving(false); return }
    }

    // Sync client payments
    const { error: pmtDelErr } = await supabase.from('hp_client_payments').delete().eq('operation_id', opId)
    if (pmtDelErr) { toast.error('Error al sincronizar cobros: ' + pmtDelErr.message); setSaving(false); return }
    const validPayments = clientPayments.filter(p => p.amount && parseFloat(p.amount) > 0)
    if (validPayments.length > 0) {
      const { error: pmtInsErr } = await supabase.from('hp_client_payments').insert(
        validPayments.map(p => ({
          operation_id: opId,
          amount: parseFloat(p.amount),
          received_by: p.received_by || null,
          payment_date: p.payment_date || new Date().toISOString().slice(0, 10),
          notes: p.notes || null,
        }))
      )
      if (pmtInsErr) { toast.error('Error al guardar cobros: ' + pmtInsErr.message); setSaving(false); return }
    }

    if (effectiveSaleDate && !saleDate) setSaleDate(effectiveSaleDate)
    toast.success(operationId ? 'Operación actualizada' : 'Operación creada')
    setSaving(false)
    onSaved()
  }

  if (loading && operationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: '#3b82f6' }} />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 sm:px-8 lg:px-14 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-xl transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{operationId ? 'Editar operación' : 'Nueva operación'}</h1>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Registra los datos de compra-venta</p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Form left */}
        <div className="lg:col-span-2 space-y-5">
          {/* Cliente */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Section title="Cliente y máquina">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Cliente" required>
                  <input value={clientName} onChange={e => setClientName(e.target.value)} className="hp-input" placeholder="Nombre del cliente" />
                </Field>
                <Field label="Estado">
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as OperationStatus)}
                    className="hp-input"
                  >
                    <option value="pending">Pendiente de venta</option>
                    <option value="sold">Vendida</option>
                    <option value="settled">Liquidada</option>
                  </select>
                </Field>
              </div>
              <Field label="Descripción de la máquina" required>
                <input value={machineDesc} onChange={e => setMachineDesc(e.target.value)} className="hp-input" placeholder="Ej: Lavavajillas Meiko M-iClean" />
              </Field>
              <Field label="Notas">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="hp-input resize-none" rows={2} placeholder="Observaciones opcionales..." />
              </Field>
            </Section>
          </motion.div>

          {/* Compra */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Section title="Compra de máquina">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Precio de compra" required>
                  <input type="number" min="0" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="hp-input" placeholder="0.00" />
                </Field>
                <Field label="Pagado por">
                  <select value={purchasePaidBy} onChange={e => setPurchasePaidBy(e.target.value)} className="hp-input">
                    <option value="">Sin especificar</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <Toggle checked={purchaseVatIncluded} onChange={setPurchaseVatIncluded} label="Precio incluye IVA" />
                <Field label="Tipo IVA">
                  <select value={purchaseVatRate} onChange={e => setPurchaseVatRate(parseFloat(e.target.value))} className="hp-input w-24">
                    {VAT_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </Field>
              </div>
              {purchasePrice && (
                <div className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', color: '#94a3b8' }}>
                  <Info size={12} className="inline mr-1.5" style={{ color: '#3b82f6' }} />
                  Neto sin IVA: <span className="font-medium text-white">
                    {formatEUR(purchaseVatIncluded ? parseFloat(purchasePrice) / (1 + purchaseVatRate) : parseFloat(purchasePrice))}
                  </span>
                </div>
              )}
            </Section>
          </motion.div>

          {/* Venta */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Section title="Venta de máquina">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Precio de venta">
                  <input type="number" min="0" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="hp-input" placeholder="0.00" />
                </Field>
                <Field label="Fecha de venta">
                  <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="hp-input" />
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <Toggle checked={saleVatIncluded} onChange={setSaleVatIncluded} label="Precio incluye IVA" />
                <Field label="Tipo IVA">
                  <select value={saleVatRate} onChange={e => setSaleVatRate(parseFloat(e.target.value))} className="hp-input w-24">
                    {VAT_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </Field>
              </div>
              {salePrice && (
                <div className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', color: '#94a3b8' }}>
                  <Info size={12} className="inline mr-1.5" style={{ color: '#3b82f6' }} />
                  Neto sin IVA: <span className="font-medium text-white">
                    {formatEUR(saleVatIncluded ? parseFloat(salePrice) / (1 + saleVatRate) : parseFloat(salePrice))}
                  </span>
                </div>
              )}
            </Section>
          </motion.div>

          {/* Cobros del cliente */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Section title={`Cobros del cliente${totalCollected > 0 ? ` · ${formatEUR(totalCollected)} cobrado` : ''}`}>
              <AnimatePresence>
                {clientPayments.map((pmt, i) => (
                  <motion.div
                    key={pmt.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid sm:grid-cols-5 gap-2 items-end pb-3 border-b"
                    style={{ borderColor: 'rgba(16,185,129,0.1)' }}
                  >
                    <div>
                      {i === 0 && <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>Importe</label>}
                      <input type="number" min="0" step="0.01" value={pmt.amount}
                        onChange={e => updatePayment(pmt.id, 'amount', e.target.value)}
                        className="hp-input text-xs" placeholder="0.00" />
                    </div>
                    <div>
                      {i === 0 && <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>Cobrado por</label>}
                      <select value={pmt.received_by} onChange={e => updatePayment(pmt.id, 'received_by', e.target.value)} className="hp-input text-xs">
                        <option value="">—</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      {i === 0 && <label className="block text-xs mb-1.5 flex items-center gap-1" style={{ color: '#94a3b8' }}><Calendar size={10} /> Fecha</label>}
                      <input type="date" value={pmt.payment_date}
                        onChange={e => updatePayment(pmt.id, 'payment_date', e.target.value)}
                        className="hp-input text-xs" />
                    </div>
                    <div>
                      {i === 0 && <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>Concepto</label>}
                      <input value={pmt.notes} onChange={e => updatePayment(pmt.id, 'notes', e.target.value)}
                        className="hp-input text-xs" placeholder="Opcional" />
                    </div>
                    <div className="flex items-center">
                      <button onClick={() => removePayment(pmt.id)} className="p-1.5 rounded-lg" style={{ color: '#ef4444' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Summary bar */}
              {clientPayments.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <span style={{ color: '#64748b' }}>Total cobrado al cliente</span>
                  <span className="font-semibold" style={{ color: '#10b981' }}>{formatEUR(totalCollected)}</span>
                </div>
              )}

              <button onClick={addPayment} className="btn-ghost flex items-center gap-2 text-xs"
                style={{ borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }}>
                <Banknote size={14} /> Añadir cobro
              </button>
            </Section>
          </motion.div>

          {/* Gastos adicionales */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Section title="Gastos adicionales">
              <AnimatePresence>
                {costs.map((cost, i) => (
                  <motion.div
                    key={cost.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid sm:grid-cols-5 gap-2 items-end pb-3 border-b"
                    style={{ borderColor: 'rgba(59,130,246,0.08)' }}
                  >
                    <div className="sm:col-span-2">
                      {i === 0 && <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>Descripción</label>}
                      <input value={cost.description} onChange={e => updateCost(cost.id, 'description', e.target.value)} className="hp-input text-xs" placeholder="Ej: Materiales" />
                    </div>
                    <div>
                      {i === 0 && <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>Importe</label>}
                      <input type="number" min="0" step="0.01" value={cost.amount} onChange={e => updateCost(cost.id, 'amount', e.target.value)} className="hp-input text-xs" placeholder="0.00" />
                    </div>
                    <div>
                      {i === 0 && <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>Pagado por</label>}
                      <select value={cost.paid_by} onChange={e => updateCost(cost.id, 'paid_by', e.target.value)} className="hp-input text-xs">
                        <option value="">—</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Toggle checked={cost.vat_included} onChange={v => updateCost(cost.id, 'vat_included', v)} label="IVA" />
                      <button onClick={() => removeCost(cost.id)} className="p-1.5 rounded-lg" style={{ color: '#ef4444' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={addCost} className="btn-ghost flex items-center gap-2 text-xs">
                <Plus size={14} /> Añadir gasto
              </button>
            </Section>
          </motion.div>
        </div>

        {/* Right: Profit preview */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="sticky top-6"
          >
            <div className="glass rounded-2xl p-5 space-y-4" style={{ border: '1px solid rgba(59,130,246,0.15)' }}>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} style={{ color: '#3b82f6' }} />
                <h3 className="text-sm font-semibold text-white">Cálculo de beneficio</h3>
              </div>

              {!profitResult ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📊</div>
                  <p className="text-xs" style={{ color: '#334155' }}>Introduce precio de compra y venta para ver el beneficio en tiempo real</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={JSON.stringify(profitResult)}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Scenario */}
                    <div className="px-3 py-2 rounded-xl text-xs text-center font-medium"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {profitResult.scenarioLabel}
                    </div>

                    {/* Numbers */}
                    {[
                      { label: 'Neto compra', value: profitResult.purchasePriceNet, color: '#ef4444' },
                      { label: 'Neto venta', value: profitResult.salePriceNet, color: '#10b981' },
                      profitResult.totalCostsNet > 0 && { label: 'Gastos adicionales', value: -profitResult.totalCostsNet, color: '#f59e0b' },
                    ].filter(Boolean).map((row: any) => (
                      <div key={row.label} className="flex justify-between items-center text-xs">
                        <span style={{ color: '#64748b' }}>{row.label}</span>
                        <span className="font-medium" style={{ color: row.color }}>{formatEUR(Math.abs(row.value))}</span>
                      </div>
                    ))}

                    <div className="border-t pt-3" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs" style={{ color: '#94a3b8' }}>Beneficio neto</span>
                        <span className="font-bold text-base" style={{ color: profitResult.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                          {formatEUR(profitResult.netProfit)}
                        </span>
                      </div>
                    </div>

                    {/* Partner shares */}
                    <div className="space-y-2 pt-1">
                      {partners.map(p => (
                        <div key={p.id} className="flex justify-between items-center px-3 py-2 rounded-xl"
                          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                              {p.name[0]}
                            </div>
                            <span className="text-xs text-white">{p.name}</span>
                          </div>
                          <span className="text-xs font-semibold" style={{ color: profitResult.partnerShare >= 0 ? '#10b981' : '#ef4444' }}>
                            {formatEUR(profitResult.partnerShare)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Save button — desktop only */}
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
              className="btn-primary w-full hidden lg:flex items-center justify-center gap-2 py-3 mt-4"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar operación'}
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Sticky bottom save button — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{ background: 'linear-gradient(to top, rgba(8,12,21,0.98) 70%, transparent)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="px-4 pb-4 pt-3 max-w-4xl mx-auto">
          <motion.button
            onClick={handleSave}
            disabled={saving}
            whileTap={{ scale: saving ? 1 : 0.97 }}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold"
            style={{ boxShadow: '0 -4px 20px rgba(59,130,246,0.3)' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Guardando...' : 'Guardar operación'}
          </motion.button>
        </div>
      </div>

      {/* Spacer to prevent content being hidden behind fixed button on mobile */}
      <div className="h-20 lg:hidden" />
    </div>
  )
}
