'use client'

import { useEffect, useState } from 'react'
import { Drawer } from './Drawer'
import { loadHistory, removeGeneration } from '@/lib/storage'
import type { Generation } from '@/lib/types'

type HistoryDrawerProps = {
  open: boolean
  onClose: () => void
  onRestore: (generation: Generation) => void
}

const dateFormat = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function HistoryDrawer({
  open,
  onClose,
  onRestore,
}: HistoryDrawerProps) {
  const [history, setHistory] = useState<Generation[]>([])

  useEffect(() => {
    if (open) setHistory(loadHistory())
  }, [open])

  return (
    <Drawer open={open} onClose={onClose} title="历史记录">
      {history.length === 0 ? (
        <p className="text-sm text-kitchen-muted">还没有生成记录。</p>
      ) : (
        <ul className="divide-y divide-kitchen-line">
          {history.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 py-3">
              <button
                type="button"
                onClick={() => {
                  onRestore(entry)
                  onClose()
                }}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm text-kitchen-ink">
                  {entry.theme}
                </p>
                <p className="mt-1 text-xs text-kitchen-muted">
                  {dateFormat.format(new Date(entry.createdAt))}，
                  {entry.dishes.length} 道菜
                </p>
              </button>

              <button
                type="button"
                aria-label={`删除 ${entry.theme}`}
                onClick={() => {
                  removeGeneration(entry.id)
                  setHistory(loadHistory())
                }}
                className="shrink-0 text-xs text-kitchen-muted transition hover:text-kitchen-ink"
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  )
}
