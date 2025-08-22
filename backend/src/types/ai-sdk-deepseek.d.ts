declare module '@ai-sdk/deepseek' {
  export interface DeepSeekOptions {
    apiKey: string;
    baseURL?: string;
    [key: string]: any;
  }

  export interface DeepSeekClient {
    (model: string): any;
    [key: string]: any;
  }

  export function createDeepSeek(options: DeepSeekOptions): DeepSeekClient;

  export const deepseek: DeepSeekClient;
}
