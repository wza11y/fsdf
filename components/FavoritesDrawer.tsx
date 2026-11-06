'use client'

import { useEffect, useState } from 'react'
import { Drawer } from './Drawer'
import { loadFavorites } from '@/lib/storage'
import type { Dish } from '@/lib/types'

type FavoritesDrawerProps = {
  open: boolean
  onClose: () => void
  onToggleFavorite: (dish: Dish) => void
}

export function FavoritesDrawer({
  open,
  onClose,
  onToggleFavorite,
}: FavoritesDrawerProps) {
  const [favorites, setFavorites] = useState<Dish[]>([])

  useEffect(() => {
    if (open) setFavorites(loadFavorites())
  }, [open])

  function handleRemove(dish: Dish) {
    onToggleFavorite(dish)
    setFavorites(loadFavorites())
  }

  return (
    <Drawer open={open} onClose={onClose} title="收藏">
      {favorites.length === 0 ? (
        <p className="text-sm text-kitchen-muted">还没有收藏的菜。</p>
      ) : (
        <ul className="divide-y divide-kitchen-line">
          {favorites.map((dish) => (
            <li
              key={dish.id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-kitchen-ink">{dish.name}</p>
                <p className="mt-1 text-xs text-kitchen-muted">
                  心动值 {dish.cravingScore}/100，{dish.cookTimeMinutes} 分钟
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleRemove(dish)}
                className="shrink-0 text-xs text-kitchen-muted transition hover:text-kitchen-ink"
              >
                取消收藏
              </button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  )
}
