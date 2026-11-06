import { describe, expect, it } from 'vitest'
import { dishToText } from '@/lib/format'
import type { Dish } from '@/lib/types'

const dish: Dish = {
  id: 'dish-1',
  name: '番茄炒蛋',
  styleTags: ['快手', '高蛋白'],
  cravingScore: 88,
  reason: '酸甜开胃，十五分钟上桌',
  cookTimeMinutes: 15,
  servings: 1,
  difficulty: '简单',
  ingredients: [
    { name: '番茄', amount: '2 个' },
    { name: '鸡蛋', amount: '2 个' },
  ],
  steps: ['番茄切块', '鸡蛋炒散', '合炒调味'],
  tip: '番茄先去皮更出沙',
  healthNote: '蛋白质充足，油量可控',
}

describe('dishToText', () => {
  it('formats a dish for pasting into a chat', () => {
    const text = dishToText(dish)

    expect(text).toContain('番茄炒蛋')
    expect(text).toContain('风格：快手 / 高蛋白')
    expect(text).toContain('心动值：88/100')
    expect(text).toContain('耗时：15 分钟')
    expect(text).toContain('推荐理由：酸甜开胃，十五分钟上桌')
    expect(text).toContain('- 番茄 2 个')
    expect(text).toContain('1. 番茄切块')
    expect(text).toContain('关键点：番茄先去皮更出沙')
    expect(text).toContain('健康：蛋白质充足，油量可控')
  })
})
