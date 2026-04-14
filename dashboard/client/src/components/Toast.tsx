import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  addToast: (options: { message: string; type: ToastType; duration?: number }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const addToast = useCallback(
    ({ message, type, duration = 4000 }: { message: string; type: ToastType; duration?: number }) => {
      const id = ++nextId.current
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    },
    []
  )

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? XCircle : Info
  const iconColor =
    toast.type === 'success'
      ? 'var(--color-bastion-green)'
      : toast.type === 'error'
      ? 'var(--color-bastion-red)'
      : 'var(--color-bastion-yellow)'

  return (
    <div
      className="pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 shadow-lg text-sm"
      style={{
        background: 'var(--color-bastion-surface)',
        borderColor: 'var(--color-bastion-border)',
        color: 'var(--color-bastion-text)',
        minWidth: '240px',
        maxWidth: '360px',
      }}
      role="status"
    >
      <Icon size={15} style={{ color: iconColor, flexShrink: 0, marginTop: '1px' }} />
      <span className="flex-1 break-words">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 transition-opacity hover:opacity-60"
        style={{ color: 'var(--color-bastion-muted)' }}
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  )
}
