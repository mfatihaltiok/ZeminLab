export type OcrProvider = 'local' | 'remote'
export interface OcrSettings { provider: OcrProvider; endpoint: string; apiKey?: string }
export interface OcrPublicSettings { provider: OcrProvider; endpoint: string; hasApiKey: boolean }
