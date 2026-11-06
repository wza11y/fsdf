import type { Dish } from './types'

export function dishToText(dish: Dish): string {
  return [
    dish.name,
    `风格：${dish.styleTags.join(' / ')}`,
    `心动值：${dish.cravingScore}/100`,
    `耗时：${dish.cookTimeMinutes} 分钟 · ${dish.servings} 人份 · ${dish.difficulty}`,
    `推荐理由：${dish.reason}`,
    '',
    '配料：',
    ...dish.ingredients.map((item) => `- ${item.name} ${item.amount}`),
    '',
    '步骤：',
    ...dish.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    `关键点：${dish.tip}`,
    `健康：${dish.healthNote}`,
  ].join('\n')
}
