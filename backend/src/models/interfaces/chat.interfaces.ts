export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: Date
}

export interface ChatRequest {
  message: string
  conversationContext: ChatMessage[]
  practiceLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  conversationType: "general" | "business" | "travel" | "academic" | "casual"
  userLanguage: "en" | "es" | "fr" | "de" | "it" | "pt"
}

export interface ChatResponse {
  response: string
  conversationId: string
  timestamp: Date
  tokensUsed?: number
  practiceLevel: string
  conversationType: string
}

export interface ConversationContext {
  messages: ChatMessage[]
  practiceLevel: string
  conversationType: string
  userLanguage: string
}

export interface OpenAIUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ChatServiceResponse {
  response: string
  usage?: OpenAIUsage
  conversationId: string
}
