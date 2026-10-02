import { ChatService } from '../chat.service';

jest.mock('openai');
jest.mock('../../../core/config/settings', () => ({
  getSetting: jest.fn((key: string, defaultValue: string) => {
    const settings: Record<string, string> = {
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'gpt-3.5-turbo',
      CHAT_RATE_LIMIT: '10',
      CHAT_RATE_WINDOW: '60000',
    };
    return settings[key] || defaultValue;
  }),
}));

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    service = new ChatService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should throw error when message is empty', async () => {
      await expect(
        service.sendMessage({
          userId: 'user-1',
          message: '',
          conversationContext: [],
          practiceLevel: 'B1',
          conversationType: 'general',
        })
      ).rejects.toThrow('Message cannot be empty');
    });

    it('should throw error when message is missing', async () => {
      await expect(
        service.sendMessage({
          userId: 'user-1',
          message: '',
          conversationContext: [],
          practiceLevel: 'B1',
          conversationType: 'general',
        })
      ).rejects.toThrow('Message cannot be empty');
    });
  });
});
