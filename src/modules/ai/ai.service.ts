import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Cấu trúc tin nhắn gửi tới OpenAI Chat Completion
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
}


@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI;

  private readonly defaultModel: string;
  private readonly defaultMaxTokens: number;
  private readonly defaultTemperature: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('OPENAI_API_KEY') || 'mock-api-key';
    const baseURL = this.configService.get<string>('OPENAI_BASE_URL') || undefined;

    this.defaultModel =
      this.configService.get<string>('OPENAI_MODEL') || 'deepseek-chat';
    this.defaultMaxTokens =
      Number(this.configService.get<number>('OPENAI_MAX_TOKENS')) || 4096;
    this.defaultTemperature =
      Number(this.configService.get<number>('OPENAI_TEMPERATURE')) || 0.7;

    this.client = new OpenAI({
      apiKey,
      baseURL: baseURL || undefined,
      timeout: 60000,
    });

    this.logger.log(
      `AiService initialized with model: ${this.defaultModel}, baseURL: ${baseURL || 'https://api.openai.com/v1'}`,
    );
  }

  setClient(client: OpenAI): void {
    this.client = client;
  }

  async generateJson<T>(
    messages: ChatMessage[],
    options?: CompletionOptions,
  ): Promise<T> {
    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || this.defaultMaxTokens;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const maxRetries = options?.maxRetries ?? 3;

    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      attempt++;
      try {
        this.logger.log(
          `Calling AI completion (attempt ${attempt}/${maxRetries}, model: ${model})...`,
        );

        const response = await this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
          throw new Error('AI returned an empty completion response.');
        }

        const parsed: T = JSON.parse(rawContent);
        this.logger.log(`AI completion successful on attempt ${attempt}`);
        return parsed;
      } catch (error: any) {
        lastError = error;
        const isRateLimit = error?.status === 429 || error?.code === 429;
        const isNetworkError =
          error?.name === 'APIConnectionError' ||
          error?.name === 'APIConnectionTimeoutError' ||
          error?.code === 'ETIMEDOUT' ||
          error?.code === 'ECONNRESET';
        const isJsonParseError = error instanceof SyntaxError;

        this.logger.warn(
          `AI request failed on attempt ${attempt}/${maxRetries}: ${error.message} ` +
          `(rateLimit: ${isRateLimit}, network: ${isNetworkError}, jsonError: ${isJsonParseError})`,
        );

        if (attempt >= maxRetries) {
          break;
        }

        const delayMs = Math.pow(2, attempt - 1) * 1000;
        this.logger.log(`Waiting ${delayMs}ms before retrying AI request...`);
        await this.delay(delayMs);
      }
    }

    this.logger.error(
      `AI request failed after ${maxRetries} attempts: ${lastError?.message}`,
    );
    throw lastError;
  }

  /**
   * Helper delay cho backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
