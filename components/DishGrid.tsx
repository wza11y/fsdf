'use client'

import { DishCard } from './DishCard'
import type { Dish } from '@/lib/types'

type DishGridProps = {
  dishes: Dish[]
  favorites: Dish[]
  onToggleFavorite: (dish: Dish) => void
}

export function DishGrid({
  dishes,
  favorites,
  onToggleFavorite,
}: DishGridProps) {
  const favoriteIds = new Set(favorites.map((dish) => dish.id))

  return (
    <div className="border-b border-kitchen-line">
      {dishes.map((dish, index) => (
        <DishCard
          key={dish.id}
          dish={dish}
          isFavorite={favoriteIds.has(dish.id)}
          onToggleFavorite={onToggleFavorite}
          defaultOpen={index === 0}
        />
      ))}
    </div>
  )
}
