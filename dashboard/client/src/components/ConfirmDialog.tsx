import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-lg border shadow-xl p-5 w-full max-w-sm mx-4"
        style={{ background: 'var(--color-bastion-surface)', borderColor: 'var(--color-bastion-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0"
            style={{ color: danger ? 'var(--color-bastion-red)' : 'var(--color-bastion-yellow)' }}
          />
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--color-bastion-text)' }}>{title}</p>
            {description && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-bastion-muted)' }}>{description}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-bastion-border)', color: 'var(--color-bastion-text)' }}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-3 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80"
            style={{
              background: danger ? 'var(--color-bastion-red)' : 'var(--color-bastion-accent)',
              color: '#fff',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
