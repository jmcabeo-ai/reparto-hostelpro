import type { OperationCost, ProfitResult } from '../types'

interface CalcInput {
  purchasePrice: number
  purchaseVatIncluded: boolean
  purchaseVatRate: number
  salePrice: number
  saleVatIncluded: boolean
  saleVatRate: number
  costs: Pick<OperationCost, 'amount' | 'vat_included' | 'vat_rate'>[]
}

function toNet(amount: number, vatIncluded: boolean, vatRate: number): number {
  return vatIncluded ? amount / (1 + vatRate) : amount
}

export function calculateProfit(input: CalcInput): ProfitResult {
  const { purchasePrice, purchaseVatIncluded, purchaseVatRate,
          salePrice, saleVatIncluded, saleVatRate, costs } = input

  const purchasePriceNet = toNet(purchasePrice, purchaseVatIncluded, purchaseVatRate)
  const salePriceNet = toNet(salePrice, saleVatIncluded, saleVatRate)

  let grossProfit: number
  let scenario: string
  let scenarioLabel: string

  if (purchaseVatIncluded && !saleVatIncluded) {
    // Compra con IVA, venta sin IVA: el IVA soportado NO es deducible (no hay IVA repercutido)
    // → el coste real es el precio bruto de compra, la venta ya es neta
    grossProfit = salePrice - purchasePrice
    scenario = 'vat_to_novat'
    scenarioLabel = 'Compra c/IVA → Venta s/IVA'
  } else if (purchaseVatIncluded && saleVatIncluded) {
    // Ambas con IVA: comparar netos
    grossProfit = salePriceNet - purchasePriceNet
    scenario = 'vat_to_vat'
    scenarioLabel = 'Compra c/IVA → Venta c/IVA'
  } else if (!purchaseVatIncluded && saleVatIncluded) {
    // Compra sin IVA, venta con IVA
    grossProfit = salePriceNet - purchasePrice
    scenario = 'novat_to_vat'
    scenarioLabel = 'Compra s/IVA → Venta c/IVA'
  } else {
    // Ambas sin IVA
    grossProfit = salePrice - purchasePrice
    scenario = 'novat_to_novat'
    scenarioLabel = 'Compra s/IVA → Venta s/IVA'
  }

  // Los costes con IVA solo son deducibles si la venta también lleva IVA
  const totalCostsNet = costs.reduce((sum, c) => {
    const deductible = c.vat_included && saleVatIncluded
    return sum + (deductible ? toNet(c.amount, c.vat_included, c.vat_rate) : c.amount)
  }, 0)

  const netProfit = grossProfit - totalCostsNet
  const partnerShare = netProfit / 2

  return {
    purchasePriceNet,
    salePriceNet,
    totalCostsNet,
    grossProfit,
    netProfit,
    partnerShare,
    scenario,
    scenarioLabel,
  }
}

export function formatEUR(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}
