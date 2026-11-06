'use client'

import { useEffect, useRef, type ReactNode } from 'react'

type DrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    panelRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="关闭抽屉"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/60"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-kitchen-line bg-kitchen-surface p-6 outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[26rem] sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl text-kitchen-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="text-sm text-kitchen-muted transition hover:text-kitchen-ink"
          >
            关闭
          </button>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
