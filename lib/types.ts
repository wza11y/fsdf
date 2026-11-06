export type Difficulty = '简单' | '中等'

export type Taste = '下饭' | '清淡' | '高蛋白'

export type Ingredient = {
  name: string
  amount: string
}

export type Dish = {
  id: string
  name: string
  styleTags: string[]
  cravingScore: number
  reason: string
  cookTimeMinutes: number
  servings: number
  difficulty: Difficulty
  ingredients: Ingredient[]
  steps: string[]
  tip: string
  healthNote: string
}

export type GenerateInput = {
  theme: string
  maxMinutes?: number
  servings?: number
  taste?: Taste
}

export type GenerationOptions = Omit<GenerateInput, 'theme'>

export type Generation = {
  id: string
  createdAt: number
  theme: string
  options: GenerationOptions
  dishes: Dish[]
}

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'MISSING_ACCESS_CODE'
  | 'BAD_REQUEST'
  | 'BAD_ORIGIN'
  | 'MISSING_API_KEY'
  | 'INVALID_KEY'
  | 'RATE_LIMIT'
  | 'TOO_FEW'
  | 'TIMEOUT'
  | 'BAD_JSON'
  | 'UPSTREAM'
  | 'NETWORK'
