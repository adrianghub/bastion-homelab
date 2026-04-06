import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { setToken } from '../api/client'
import { Server, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [token, setTokenInput] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/containers', {
        headers: { Authorization: `Bearer ${token.trim()}` },
      })
      if (res.status === 401) {
        setError('Invalid token')
        return
      }
      setToken(token.trim())
      navigate('/')
    } catch {
      setError('Could not reach the API — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--color-bastion-bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-xl border p-8 shadow-xl"
        style={{ background: 'var(--color-bastion-surface)', borderColor: 'var(--color-bastion-border)' }}
      >
        <div className="flex items-center gap-2.5 mb-6">
          <div
            className="p-2 rounded-lg"
            style={{ background: 'rgba(88,166,255,0.1)' }}
          >
            <Server size={18} style={{ color: 'var(--color-bastion-accent)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-bastion-text)' }}>Bastion Dashboard</p>
            <p className="text-xs" style={{ color: 'var(--color-bastion-muted)' }}>Raspberry Pi 5</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-bastion-muted)' }}>
              Auth token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="DASHBOARD_AUTH_TOKEN"
                className="w-full px-3 py-2.5 rounded-md text-sm font-mono outline-none pr-9"
                style={{
                  background: 'var(--color-bastion-bg)',
                  border: `1px solid ${error ? 'var(--color-bastion-red)' : 'var(--color-bastion-border)'}`,
                  color: 'var(--color-bastion-text)',
                }}
                autoFocus
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowToken((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-bastion-muted)' }}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--color-bastion-red)' }}>{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full py-2.5 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--color-bastion-accent)', color: '#0d1117' }}
          >
            {loading ? 'Verifying…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
