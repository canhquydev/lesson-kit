import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AiErrorLog,
  AiErrorLogDocument,
} from './schemas/ai-error-log.schema';

export interface AiErrorLogEntry {
  kitId?: string;
  component: string;
  attempt: number;
  errorType: string;
  errorMessages: string[];
  rawOutput?: string;
  model?: string;
}

@Injectable()
export class AiLogsService {
  private readonly logger = new Logger(AiLogsService.name);

  constructor(
    @InjectModel(AiErrorLog.name)
    private readonly aiErrorLogModel: Model<AiErrorLogDocument>,
  ) {}

  /**
   * Fire-and-forget: ghi log lỗi AI vào DB mà không chặn luồng chính.
   * Không bao giờ throw lỗi ra ngoài.
   */
  logError(entry: AiErrorLogEntry): void {
    const doc: Partial<AiErrorLog> = {
      component: entry.component,
      attempt: entry.attempt,
      error_type: entry.errorType,
      error_messages: entry.errorMessages,
      raw_output: entry.rawOutput
        ? entry.rawOutput.substring(0, 5000) // Giới hạn 5KB để tránh phình DB
        : undefined,
      ai_model: entry.model,
    };

    if (entry.kitId) {
      try {
        doc.kit_id = new Types.ObjectId(entry.kitId);
      } catch {
        // kitId không hợp lệ — bỏ qua
      }
    }

    // Fire-and-forget: không await, không chặn luồng sinh bài giảng
    this.aiErrorLogModel.create(doc).catch((err) => {
      this.logger.warn(`Failed to persist AI error log: ${err.message}`);
    });
  }
}
