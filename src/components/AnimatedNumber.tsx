import { useEffect, useRef, useState } from 'react'
import { formatEUR } from '../lib/profit'

interface Props {
  value: number
  currency?: boolean
  duration?: number
  className?: string
}

export default function AnimatedNumber({ value, currency = false, duration = 800, className = '' }: Props) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    startRef.current = display
    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startRef.current + (value - startRef.current) * eased
      setDisplay(current)
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  const formatted = currency
    ? formatEUR(display)
    : display.toFixed(2)

  return <span className={className}>{formatted}</span>
}
