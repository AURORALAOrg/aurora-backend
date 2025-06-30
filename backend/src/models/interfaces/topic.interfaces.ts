export interface TopicPrompt {
  text: string
  type: "starter" | "follow_up" | "scenario"
  difficulty: string
}

export interface TopicObjective {
  skill: "speaking" | "listening" | "vocabulary" | "grammar"
  description: string
  examples: string[]
}

export interface TopicKeyword {
  word: string
  definition: string
  example: string
  difficulty: "basic" | "intermediate" | "advanced"
}

export interface Topic {
  id: string
  name: string
  description: string
  category: string
  englishLevel: string
  prompts: TopicPrompt[]
  keywords: TopicKeyword[]
  objectives: TopicObjective[]
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateTopicRequest {
  name: string
  description: string
  category: string
  englishLevel: string
  prompts: TopicPrompt[]
  keywords: TopicKeyword[]
  objectives: TopicObjective[]
}

export interface UpdateTopicRequest extends Partial<CreateTopicRequest> {
  id: string
}

export interface TopicFilter {
  level?: string
  category?: string
  status?: string
  search?: string
}

export interface TopicListResponse {
  topics: Topic[]
  total: number
  page: number
  limit: number
}

export interface TopicChatContext {
  topicId: string
  topicName: string
  category: string
  level: string
  currentPrompts: TopicPrompt[]
  keywords: TopicKeyword[]
  objectives: TopicObjective[]
}
