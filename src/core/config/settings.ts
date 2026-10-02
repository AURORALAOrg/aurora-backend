const settings: Record<string, string> = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  CHAT_RATE_LIMIT: process.env.CHAT_RATE_LIMIT || '10',
  CHAT_RATE_WINDOW: process.env.CHAT_RATE_WINDOW || '60000',
};

export function getSetting(key: string, defaultValue: string = ''): string {
  return settings[key] || defaultValue;
}

export function updateSetting(key: string, value: string): void {
  settings[key] = value;
}
