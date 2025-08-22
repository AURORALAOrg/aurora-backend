declare module 'ai' {
  export interface GenerateTextOptions {
    model: any;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  }

  export interface GenerateTextResult {
    text: string;
    [key: string]: any;
  }

  export function generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
}
