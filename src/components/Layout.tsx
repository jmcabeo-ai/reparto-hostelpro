import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ClipboardList, Scale, ArrowLeftRight,
  LogOut, Menu, X, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  page: string
  setPage: (p: string) => void
  children: React.ReactNode
}

const navItems = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'operations', label: 'Operaciones', icon: ClipboardList },
  { id: 'balance', label: 'Balance', icon: Scale },
  { id: 'settlements', label: 'Pagos', icon: ArrowLeftRight },
]

export default function Layout({ page, setPage, children }: Props) {
  const { profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#080c14' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 glass border-r" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
        {/* Logo */}
        <div className="p-6 pb-5 border-b" style={{ borderColor: 'rgba(59,130,246,0.08)' }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'white', padding: '2px' }}>
              <img
                src="https://hostelpro.net/logo.png"
                alt="Hostelpro"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Hostelpro</div>
              <div className="text-xs" style={{ color: '#64748b' }}>Panel de socios</div>
            </div>
          </motion.div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item, i) => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left group ${active ? 'nav-active' : ''}`}
                style={{ color: active ? '#60a5fa' : '#64748b' }}
              >
                <Icon size={18} className={active ? 'text-blue-400' : 'group-hover:text-blue-400 transition-colors'} />
                <span className={active ? '' : 'group-hover:text-slate-300 transition-colors'}>{item.label}</span>
                {active && (
                  <motion.div layoutId="nav-indicator" className="ml-auto">
                    <ChevronRight size={14} className="text-blue-400" />
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(59,130,246,0.08)' }}>
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
              {profile?.name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{profile?.name ?? 'Usuario'}</div>
              <div className="text-xs truncate" style={{ color: '#64748b' }}>{profile?.email ?? ''}</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200"
            style={{ color: '#64748b' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
          >
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 glass border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'white', padding: '1px' }}>
            <img src="https://hostelpro.net/logo.png" alt="" className="w-full h-full object-contain rounded-lg" />
          </div>
          <span className="font-bold text-white text-sm">Hostelpro</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl" style={{ color: '#64748b' }}>
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col glass-strong lg:hidden"
            >
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
                <span className="font-bold text-white">Menú</span>
                <button onClick={() => setMobileOpen(false)} style={{ color: '#64748b' }}><X size={20} /></button>
              </div>
              <nav className="flex-1 p-4 space-y-1">
                {navItems.map(item => {
                  const Icon = item.icon
                  const active = page === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setPage(item.id); setMobileOpen(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left ${active ? 'nav-active' : ''}`}
                      style={{ color: active ? '#60a5fa' : '#64748b' }}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  )
                })}
              </nav>
              <div className="p-4">
                <button onClick={signOut} className="flex items-center gap-2 text-sm px-3 py-2" style={{ color: '#ef4444' }}>
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-16 lg:pb-0 pb-20">
        <div className="bg-dots absolute inset-0 pointer-events-none opacity-40" />
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="relative min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom tab bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t"
        style={{ borderColor: 'rgba(59,130,246,0.12)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(item => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-200 flex-1"
                style={{ color: active ? '#60a5fa' : '#475569' }}
              >
                <motion.div
                  animate={{ scale: active ? 1.15 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Icon size={20} />
                </motion.div>
                <span className="text-xs font-medium">{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute bottom-1 w-1 h-1 rounded-full"
                    style={{ background: '#3b82f6' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
