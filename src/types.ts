export type OperationStatus = 'pending' | 'sold' | 'settled'

export interface Profile {
  id: string
  email: string
  name: string
  avatar_url?: string
  created_at: string
}

export interface Operation {
  id: string
  created_by: string
  client_name: string
  machine_description: string
  notes?: string
  status: OperationStatus

  purchase_price: number
  purchase_vat_included: boolean
  purchase_vat_rate: number
  purchase_paid_by: string | null

  sale_price: number | null
  sale_vat_included: boolean
  sale_vat_rate: number
  sale_date: string | null

  profit_net: number | null
  partner_share: number | null

  created_at: string
  updated_at: string
}

export interface OperationCost {
  id: string
  operation_id: string
  description: string
  amount: number
  vat_included: boolean
  vat_rate: number
  paid_by: string | null
  created_at: string
}

export interface Settlement {
  id: string
  paid_by: string
  paid_to: string
  amount: number
  notes?: string
  settlement_date: string
  created_at: string
}

export interface AiConversation {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ProfitResult {
  purchasePriceNet: number
  salePriceNet: number
  totalCostsNet: number
  grossProfit: number
  netProfit: number
  partnerShare: number
  scenario: string
  scenarioLabel: string
}

export interface PartnerBalance {
  partnerId: string
  partnerName: string
  totalProfit: number
  totalPaid: number
  totalSettled: number
  currentBalance: number
}
