import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompt'

describe('buildSystemPrompt', () => {
  it('locks the Chinese-only JSON contract and dish count', () => {
    const prompt = buildSystemPrompt()

    expect(prompt).toContain('中文')
    expect(prompt).toContain('10 道')
    expect(prompt).toContain('至少 8 道')
    expect(prompt).toContain('JSON')
  })

  it('does not mention removed platform or content-type dimensions', () => {
    const prompt = buildSystemPrompt()

    for (const word of ['小红书', '抖音', '平台', '内容类型']) {
      expect(prompt).not.toContain(word)
    }
  })
})

describe('buildUserPrompt', () => {
  it('trims the theme and includes it', () => {
    expect(buildUserPrompt({ theme: '  想吃点清淡的  ' })).toBe(
      '主题：想吃点清淡的',
    )
  })

  it('includes optional constraints when provided', () => {
    const prompt = buildUserPrompt({
      theme: '高蛋白',
      maxMinutes: 20,
      servings: 2,
      taste: '清淡',
    })

    expect(prompt).toContain('最多耗时：20 分钟')
    expect(prompt).toContain('几人吃：2 人')
    expect(prompt).toContain('口味倾向：清淡')
  })

  it('omits optional constraints when absent', () => {
    const prompt = buildUserPrompt({ theme: '高蛋白' })

    expect(prompt).not.toContain('最多耗时')
    expect(prompt).not.toContain('几人吃')
    expect(prompt).not.toContain('口味倾向')
  })
})
