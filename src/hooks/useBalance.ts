import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Operation, OperationCost, Settlement } from '../types'

function toNet(amount: number, vatIncluded: boolean, vatRate: number): number {
  return vatIncluded ? amount / (1 + vatRate) : amount
}

export interface BalanceEntry {
  operationId: string
  clientName: string
  machineDescription: string
  status: string
  aitorPaid: number
  jonathanPaid: number
  aitorReceived: number
  jonathanReceived: number
  totalCollected: number
  netProfit: number
  aitorShare: number
  jonathanShare: number
  aitorNet: number
  jonathanNet: number
}

export interface PartnerSummary {
  totalProfit: number
  aitorBalance: number
  jonathanBalance: number
  toSettle: number
  settleDirection: 'aitor_pays' | 'jonathan_pays' | 'even'
}

export function useBalance(
  aitorId: string | undefined,
  jonathanId: string | undefined
) {
  const [entries, setEntries] = useState<BalanceEntry[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [summary, setSummary] = useState<PartnerSummary>({
    totalProfit: 0,
    aitorBalance: 0,
    jonathanBalance: 0,
    toSettle: 0,
    settleDirection: 'even',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!aitorId || !jonathanId) return
    load(aitorId, jonathanId)
  }, [aitorId, jonathanId])

  async function load(aId: string, jId: string) {
    setLoading(true)
    const [{ data: ops }, { data: costsAll }, { data: settlementsData }, { data: paymentsAll }] = await Promise.all([
      supabase.from('hp_operations').select('*').in('status', ['sold', 'settled']),
      supabase.from('hp_operation_costs').select('*'),
      supabase.from('hp_settlements').select('*').order('created_at', { ascending: false }),
      supabase.from('hp_client_payments').select('*'),
    ])

    const operations: Operation[] = ops ?? []
    const costs: OperationCost[] = costsAll ?? []
    const setts: Settlement[] = settlementsData ?? []
    const allPayments: { operation_id: string; amount: number; received_by: string | null }[] = paymentsAll ?? []

    const calcEntries: BalanceEntry[] = operations.map(op => {
      const opCosts = costs.filter(c => c.operation_id === op.id)
      const opPayments = allPayments.filter(p => p.operation_id === op.id)

      // Gastos desembolsados por cada socio
      // El IVA soportado solo es deducible si la venta también lleva IVA (Aitor lo repercute y puede compensar)
      const purchaseVatDeductible = op.purchase_vat_included && op.sale_vat_included
      const effectivePurchase = purchaseVatDeductible
        ? toNet(op.purchase_price, op.purchase_vat_included, op.purchase_vat_rate)
        : op.purchase_price

      let aitorPaid = 0
      let jonathanPaid = 0
      if (op.purchase_paid_by === aId) aitorPaid += effectivePurchase
      else if (op.purchase_paid_by === jId) jonathanPaid += effectivePurchase

      opCosts.forEach(c => {
        const costVatDeductible = c.vat_included && op.sale_vat_included
        const effectiveCost = costVatDeductible
          ? toNet(c.amount, c.vat_included, c.vat_rate)
          : c.amount
        if (c.paid_by === aId) aitorPaid += effectiveCost
        else if (c.paid_by === jId) jonathanPaid += effectiveCost
      })

      // Cobros recibidos del cliente por cada socio (en neto, sin IVA repercutido)
      let aitorReceived = 0
      let jonathanReceived = 0
      opPayments.forEach(p => {
        if (p.received_by === aId) aitorReceived += toNet(p.amount, op.sale_vat_included, op.sale_vat_rate)
        else if (p.received_by === jId) jonathanReceived += toNet(p.amount, op.sale_vat_included, op.sale_vat_rate)
      })

      const totalCollected = aitorReceived + jonathanReceived
      const netProfit = op.profit_net ?? 0
      const share = op.partner_share ?? 0

      // Posición neta de cada socio respecto al 50/50:
      // lo que tiene en mano (cobrado - pagado) vs lo que le corresponde (share)
      // Si aitorNet > 0 → Aitor tiene más de lo que le toca → le debe a Jonathan
      const aitorNetRaw = (aitorReceived - aitorPaid) - share
      const jonathanNetRaw = (jonathanReceived - jonathanPaid) - share

      return {
        operationId: op.id,
        clientName: op.client_name,
        machineDescription: op.machine_description,
        status: op.status,
        aitorPaid,
        jonathanPaid,
        aitorReceived,
        jonathanReceived,
        totalCollected,
        netProfit,
        aitorShare: share,
        jonathanShare: share,
        aitorNet: -aitorNetRaw,   // positivo = a favor de Aitor
        jonathanNet: -jonathanNetRaw,
      }
    })

    const totalProfit = calcEntries.reduce((s, e) => s + e.netProfit, 0)
    const rawAitorBalance = calcEntries.reduce((s, e) => s + e.aitorNet, 0)
    const rawJonathanBalance = calcEntries.reduce((s, e) => s + e.jonathanNet, 0)

    // Restar liquidaciones ya realizadas
    // settledAmount > 0 significa que Jonathan ha pagado a Aitor (reduce deuda de Jonathan, liquida crédito de Aitor)
    // settledAmount < 0 significa que Aitor ha pagado a Jonathan
    const settledAmount = setts.reduce((s, sett) => {
      if (sett.paid_by === jId && sett.paid_to === aId) return s + sett.amount
      if (sett.paid_by === aId && sett.paid_to === jId) return s - sett.amount
      return s
    }, 0)

    const aitorBalance = rawAitorBalance - settledAmount
    const jonathanBalance = rawJonathanBalance + settledAmount

    const toSettle = Math.abs(aitorBalance - jonathanBalance) / 2
    const settleDirection = aitorBalance > jonathanBalance
      ? 'jonathan_pays' : aitorBalance < jonathanBalance
      ? 'aitor_pays' : 'even'

    setEntries(calcEntries)
    setSettlements(setts)
    setSummary({ totalProfit, aitorBalance, jonathanBalance, toSettle, settleDirection })
    setLoading(false)
  }

  return { entries, settlements, summary, loading, reload: () => aitorId && jonathanId && load(aitorId, jonathanId) }
}
