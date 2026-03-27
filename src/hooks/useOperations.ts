import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Operation, OperationCost } from '../types'

export interface ClientPayment {
  id: string
  operation_id: string
  amount: number
  received_by: string | null
  payment_date: string
  notes: string | null
  created_at: string
}

export function useOperations() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('hp_operations')
      .select('*')
      .order('created_at', { ascending: false })
    setOperations(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { operations, loading, reload: load }
}

export function useOperation(id: string | null) {
  const [operation, setOperation] = useState<Operation | null>(null)
  const [costs, setCosts] = useState<OperationCost[]>([])
  const [payments, setPayments] = useState<ClientPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    load(id)
  }, [id])

  async function load(opId: string) {
    setLoading(true)
    const [{ data: op }, { data: opCosts }, { data: opPayments }] = await Promise.all([
      supabase.from('hp_operations').select('*').eq('id', opId).single(),
      supabase.from('hp_operation_costs').select('*').eq('operation_id', opId).order('created_at'),
      supabase.from('hp_client_payments').select('*').eq('operation_id', opId).order('payment_date'),
    ])
    setOperation(op)
    setCosts(opCosts ?? [])
    setPayments(opPayments ?? [])
    setLoading(false)
  }

  return { operation, costs, payments, loading, reload: () => id && load(id) }
}

export function usePartners() {
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    supabase.from('hp_profiles').select('id, name').then(({ data }) => {
      setPartners(data ?? [])
    })
  }, [])

  return partners
}
