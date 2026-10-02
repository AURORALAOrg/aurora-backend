import OpenAI from 'openai';
import logger from '../core/config/logger';
import { getSetting } from '../core/config/settings';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  userId: string;
  message: string;
  conversationContext: ChatMessage[];
  practiceLevel: string;
  conversationType: string;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  timestamp: string;
  tokensUsed: number;
}

const PRACTICE_LEVEL_PROMPTS: Record<string, string> = {
  A1: 'You are a patient language tutor helping an absolute beginner (A1 level). Use very simple words, short sentences, and lots of encouragement. Correct minor mistakes gently.',
  A2: 'You are a supportive language tutor helping an elementary learner (A2 level). Use simple but complete sentences. Introduce new vocabulary gradually with context clues.',
  B1: 'You are an encouraging language tutor helping an intermediate learner (B1 level). Have natural conversations while gently correcting mistakes and suggesting better alternatives.',
  B2: 'You are a skilled language tutor helping an upper-intermediate learner (B2 level). Engage in complex conversations, correct nuanced mistakes, and introduce sophisticated vocabulary.',
  C1: 'You are an expert language tutor helping an advanced learner (C1 level). Discuss complex topics, refine stylistic choices, and help with near-native expression.',
  C2: 'You are a master language tutor helping a proficient learner (C2 level). Engage in nuanced, academic, or professional conversations. Focus on subtle distinctions and native-like fluency.',
};

const DEFAULT_SYSTEM_PROMPT = PRACTICE_LEVEL_PROMPTS['B1'];

export class ChatService {
  private openai: OpenAI;
  private conversationSessions: Map<string, ChatMessage[]>;
  private rateLimitWindow: Map<string, { count: number; resetTime: number }>;

  constructor() {
    const apiKey = getSetting('OPENAI_API_KEY', '');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.openai = new OpenAI({ apiKey });
    this.conversationSessions = new Map();
    this.rateLimitWindow = new Map();
  }

  private getModelName(): string {
    return getSetting('OPENAI_MODEL', 'gpt-3.5-turbo');
  }

  private sanitizeInput(text: string): string {
    return text
      .replace(/[<>&"']/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;'
        };
        return entities[char] || char;
      })
      .trim()
      .slice(0, 2000);
  }

  private generateConversationId(userId: string, timestamp: number): string {
    return `${userId}-${timestamp}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const limit = parseInt(getSetting('CHAT_RATE_LIMIT', '10'));
    const windowMs = parseInt(getSetting('CHAT_RATE_WINDOW', '60000'));

    const userLimit = this.rateLimitWindow.get(userId) || { count: 0, resetTime: now + windowMs };

    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + windowMs;
    }

    userLimit.count++;
    this.rateLimitWindow.set(userId, userLimit);

    return userLimit.count <= limit;
  }

  private async callOpenAI(
    systemPrompt: string,
    messages: ChatMessage[]
  ): Promise<{ response: string; tokens: number }> {
    const model = this.getModelName();
    logger.info(`Calling OpenAI model: ${model}`);

    const completion = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseMessage = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    return { response: responseMessage, tokens: tokensUsed };
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const { userId, message, conversationContext, practiceLevel, conversationType } = request;

    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded');
    }

    const sanitizedMessage = this.sanitizeInput(message);
    const level = Object.keys(PRACTICE_LEVEL_PROMPTS).includes(practiceLevel)
      ? practiceLevel
      : 'B1';

    const systemPrompt = `${PRACTICE_LEVEL_PROMPTS[level]} Conversation type: ${conversationType}. Always respond in the target language appropriate for the level.`;

    const sessionKey = `${userId}-${practiceLevel}-${conversationType}`;
    let sessionHistory = this.conversationSessions.get(sessionKey) || [];

    const messages: ChatMessage[] = [
      ...sessionHistory.slice(-10),
      { role: 'user', content: sanitizedMessage },
    ];

    let result: { response: string; tokens: number };
    try {
      result = await this.callOpenAI(systemPrompt, messages);
    } catch (error: any) {
      if (error.status === 429 || error.message?.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded');
      }
      if (error.status === 429 && error.type === 'insufficient_quota') {
        throw new Error('Service quota exceeded');
      }
      throw new Error(`OpenAI API error: ${error.message}`);
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: result.response,
    };

    sessionHistory = [...sessionHistory, { role: 'user', content: sanitizedMessage }, assistantMessage];
    if (sessionHistory.length > 20) {
      sessionHistory = sessionHistory.slice(-20);
    }
    this.conversationSessions.set(sessionKey, sessionHistory);

    logger.info(`Chat response generated for user ${userId}, tokens: ${result.tokens}`);

    return {
      response: result.response,
      conversationId: this.generateConversationId(userId, Date.now()),
      timestamp: new Date().toISOString(),
      tokensUsed: result.tokens,
    };
  }
}
