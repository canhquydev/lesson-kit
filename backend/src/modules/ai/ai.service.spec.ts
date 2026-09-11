import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import OpenAI from 'openai';

describe('AiService', () => {
  let service: AiService;
  let mockOpenAIClient: any;

  beforeEach(async () => {
    mockOpenAIClient = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const configs: Record<string, any> = {
                OPENAI_API_KEY: 'test-api-key',
                OPENAI_BASE_URL: 'https://api.test.com/v1',
                OPENAI_MODEL: 'test-model',
                OPENAI_MAX_TOKENS: 2048,
                OPENAI_TEMPERATURE: 0.5,
              };
              return configs[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    service.setClient(mockOpenAIClient as unknown as OpenAI);
    // Speed up delay for tests
    (service as any).delay = jest.fn().mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call OpenAI chat completion with json_object response_format and return parsed JSON', async () => {
    const mockOutput = { result: 'success', items: [1, 2, 3] };
    mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockOutput) } }],
    });

    const messages = [{ role: 'user' as const, content: 'Generate JSON' }];
    const result = await service.generateJson<{ result: string; items: number[] }>(
      messages,
    );

    expect(result).toEqual(mockOutput);
    expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(1);
    expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
      model: 'test-model',
      messages,
      temperature: 0.5,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    });
  });

  it('should retry when JSON parse fails and succeed on next attempt', async () => {
    const mockOutput = { status: 'ok' };
    mockOpenAIClient.chat.completions.create
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'invalid json content' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockOutput) } }],
      });

    const messages = [{ role: 'user' as const, content: 'Generate JSON' }];
    const result = await service.generateJson<{ status: string }>(messages);

    expect(result).toEqual(mockOutput);
    expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it('should retry when 429 rate limit error occurs and succeed on next attempt', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).status = 429;

    const mockOutput = { status: 'recovered' };
    mockOpenAIClient.chat.completions.create
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockOutput) } }],
      });

    const messages = [{ role: 'user' as const, content: 'Generate JSON' }];
    const result = await service.generateJson<{ status: string }>(messages);

    expect(result).toEqual(mockOutput);
    expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it('should throw after 3 failed attempts', async () => {
    const networkError = new Error('Network timeout');
    (networkError as any).code = 'ETIMEDOUT';

    mockOpenAIClient.chat.completions.create.mockRejectedValue(networkError);

    const messages = [{ role: 'user' as const, content: 'Generate JSON' }];
    await expect(service.generateJson(messages, { maxRetries: 3 })).rejects.toThrow(
      'Network timeout',
    );
    expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(3);
  });
});
