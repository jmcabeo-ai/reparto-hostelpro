import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import AiAgent from './components/AiAgent'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OperationsPage from './pages/OperationsPage'
import OperationFormPage from './pages/OperationFormPage'
import BalancePage from './pages/BalancePage'
import SettlementsPage from './pages/SettlementsPage'
import { Loader2 } from 'lucide-react'

type Page = 'dashboard' | 'operations' | 'new-operation' | 'edit-operation' | 'balance' | 'settlements'

function AppInner() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState<Page>('dashboard')
  const [editingId, setEditingId] = useState<string | undefined>()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c14' }}>
        <div className="flex items-center gap-3">
          <Loader2 size={24} className="animate-spin" style={{ color: '#3b82f6' }} />
          <span className="text-sm" style={{ color: '#64748b' }}>Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  function navigate(p: string, id?: string) {
    if (p === 'edit-operation') {
      setEditingId(id)
      setPage('edit-operation')
    } else if (p === 'new-operation') {
      setEditingId(undefined)
      setPage('new-operation')
    } else {
      setPage(p as Page)
    }
  }

  const layoutPage = page === 'new-operation' || page === 'edit-operation' ? 'operations' : page

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} />
      case 'operations':
        return <OperationsPage onNavigate={navigate} />
      case 'new-operation':
        return (
          <OperationFormPage
            onBack={() => setPage('operations')}
            onSaved={() => setPage('operations')}
          />
        )
      case 'edit-operation':
        return (
          <OperationFormPage
            operationId={editingId}
            onBack={() => setPage('operations')}
            onSaved={() => setPage('operations')}
          />
        )
      case 'balance':
        return <BalancePage onNavigate={navigate} />
      case 'settlements':
        return <SettlementsPage />
      default:
        return <DashboardPage onNavigate={navigate} />
    }
  }

  return (
    <>
      <Layout page={layoutPage} setPage={p => navigate(p)}>
        {renderPage()}
      </Layout>
      <AiAgent />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0f1623',
            color: '#e2e8f0',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '12px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#0f1623' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0f1623' } },
        }}
      />
    </AuthProvider>
  )
}
