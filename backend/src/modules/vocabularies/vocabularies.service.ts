import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vocabulary, VocabularyDocument } from './schemas/vocabulary.schema';
import { AiService } from '../ai/ai.service';
import {
  ComponentGenerator,
  ComponentDependencies,
  ValidationResult,
  validateAndRetry,
} from '../../common/validators';
import { GenerationContext } from '../../common/interfaces';

@Injectable()
export class VocabulariesService
  implements ComponentGenerator<VocabularyDocument> {
  private readonly logger = new Logger(VocabulariesService.name);

  constructor(
    @InjectModel(Vocabulary.name)
    private readonly vocabularyModel: Model<VocabularyDocument>,
    private readonly aiService: AiService,
  ) { }

  async generate(
    context: GenerationContext,
    dependencies?: ComponentDependencies,
  ): Promise<VocabularyDocument[]> {
    this.logger.log(
      `Generating vocabularies for lesson: "${context.title}" (${context.subject} Grade ${context.grade})`,
    );

    const rawVocabularies = await validateAndRetry<any>(
      async (previousErrors?: string[]) => {
        const prompt = this.getPrompt(context, dependencies, previousErrors);
        const response = await this.aiService.generateJson<{
          vocabularies: any[];
        }>([
          {
            role: 'system',
            content:
              'You are an expert bilingual education specialist and curriculum designer for English medium instruction. ' +
              'Always respond strictly with a valid JSON object matching the requested schema.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ]);

        return response.vocabularies || [];
      },
      (data: any[]) => this.validate(data),
      3,
    );

    return rawVocabularies.map((item, index) => ({
      ...item,
      sort_order: item.sort_order ?? index + 1,
    })) as VocabularyDocument[];
  }

  /**
   * Kiểm tra tính hợp lệ của danh sách từ vựng do AI sinh ra:
   * - Phải có từ 8 đến 15 từ vựng chuyên ngành.
   * - Mỗi từ phải đầy đủ các trường bắt buộc: word, phonetic (chuẩn IPA), meaning_vi, part_of_speech, example_sentence.
   */
  validate(data: any[]): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: ['Output must be an array of vocabulary items under "vocabularies" key.'],
      };
    }

    if (data.length < 8 || data.length > 15) {
      errors.push(
        `Vocabulary count must be between 8 and 15 words. Current count: ${data.length}.`,
      );
    }

    data.forEach((item, index) => {
      const prefix = `Item [${index + 1}] (${item?.word || 'unnamed'})`;

      if (!item?.word || typeof item.word !== 'string' || !item.word.trim()) {
        errors.push(`${prefix}: Missing or empty "word".`);
      }

      if (
        !item?.phonetic ||
        typeof item.phonetic !== 'string' ||
        !item.phonetic.trim()
      ) {
        errors.push(`${prefix}: Missing or empty "phonetic".`);
      } else if (
        !item.phonetic.includes('/') &&
        !item.phonetic.includes('[') &&
        !item.phonetic.includes('ˈ') &&
        !item.phonetic.includes('ˌ')
      ) {
        errors.push(
          `${prefix}: "phonetic" should be a valid IPA representation enclosed in /.../ (e.g., /ˈfɪzɪks/).`,
        );
      }

      if (
        !item?.meaning_vi ||
        typeof item.meaning_vi !== 'string' ||
        !item.meaning_vi.trim()
      ) {
        errors.push(
          `${prefix}: Missing or empty "meaning_vi" (Vietnamese contextual meaning).`,
        );
      }

      if (
        !item?.part_of_speech ||
        typeof item.part_of_speech !== 'string' ||
        !item.part_of_speech.trim()
      ) {
        errors.push(`${prefix}: Missing or empty "part_of_speech".`);
      }

      if (
        !item?.example_sentence ||
        typeof item.example_sentence !== 'string' ||
        !item.example_sentence.trim()
      ) {
        errors.push(
          `${prefix}: Missing or empty "example_sentence" based on lesson content.`,
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Tạo prompt chi tiết cho AI sinh từ vựng
   */
  getPrompt(
    context: GenerationContext,
    dependencies?: ComponentDependencies,
    retryErrors?: string[],
  ): string;
  getPrompt(context: GenerationContext, retryErrors?: string[]): string;
  getPrompt(
    context: GenerationContext,
    dependenciesOrErrors?: ComponentDependencies | string[],
    retryErrors?: string[],
  ): string {
    const retryErrList = Array.isArray(dependenciesOrErrors)
      ? dependenciesOrErrors
      : retryErrors;

    let prompt = `Bạn là chuyên gia giảng dạy song ngữ tiếng Anh cho các môn học phổ thông tại Việt Nam.
Hãy phân tích nội dung bài học sau đây và sinh danh sách TỪ VỰNG CHUYÊN NGÀNH TIẾNG ANH (Phase 1 Component) để giáo viên sử dụng khi dạy học bằng tiếng Anh:

--- THÔNG TIN BÀI HỌC ---
- Môn học: ${context.subject}
- Khối lớp: ${context.grade}
- Tên bài học: ${context.title}
- Mức độ hỗ trợ tiếng Anh: ${context.supportLevel}
- Thời lượng tiết học: ${context.duration} phút
- Nội dung bài học gốc:
"""
${context.content}
"""

--- YÊU CẦU ĐẦU RA (BẮT BUỘC) ---
1. Số lượng: Đúng từ 8 đến 15 từ vựng chuyên ngành then chốt.
2. Lọc từ: Chỉ chọn những thuật ngữ chuyên ngành quan trọng nhất trong bài học mà giáo viên và học sinh cần dùng.
3. Nghĩa tiếng Việt (meaning_vi): BẮT BUỘC phải theo đúng ngữ cảnh môn học/bài học này (Ví dụ: trong Vật lí, "matter" = "vật chất" chứ không phải "vấn đề"; "field" = "trường" chứ không phải "cánh đồng").
4. Phiên âm IPA (phonetic): Phiên âm quốc tế chuẩn xác, đặt trong dấu gạch chéo /.../ (Ví dụ: /ˈfɪzɪks/).
5. Câu ví dụ (example_sentence): BẮT BUỘC phải được trích xuất từ nội dung bài học hoặc có liên quan chặt chẽ đến kiến thức bài học đang dạy.
6. Ghi chú ngữ cảnh (context_note): Nêu rõ tình huống hoặc cách dùng thuật ngữ này trong bài.

--- ĐỊNH DẠNG JSON YÊU CẦU ---
Trả về đối tượng JSON duy nhất có cấu trúc:
{
  "vocabularies": [
    {
      "word": "từ tiếng Anh",
      "phonetic": "/phiên âm IPA/",
      "meaning_vi": "nghĩa chuyên ngành tiếng Việt",
      "part_of_speech": "noun | verb | adjective | phrase",
      "example_sentence": "câu ví dụ bám sát nội dung bài học",
      "context_note": "ghi chú cách dùng trong bài"
    }
  ]
}
`;

    if (retryErrList && retryErrList.length > 0) {
      prompt += `
⚠️ CHÚ Ý: Lần sinh trước bị lỗi validation. Bạn BẮT BUỘC phải khắc phục triệt để các lỗi sau:
${retryErrList.map((err, i) => `${i + 1}. ${err}`).join('\n')}
`;
    }

    return prompt;
  }

  /**
   * Lấy danh sách từ vựng theo ID của Lesson Kit
   */
  async findByKitId(kitId: string): Promise<VocabularyDocument[]> {
    return this.vocabularyModel
      .find({ lesson_kit_id: new Types.ObjectId(kitId) })
      .sort({ sort_order: 1 })
      .exec();
  }

  /**
   * Xoá toàn bộ từ vựng theo ID của Lesson Kit
   */
  async deleteByKitId(kitId: string): Promise<void> {
    await this.vocabularyModel
      .deleteMany({ lesson_kit_id: new Types.ObjectId(kitId) })
      .exec();
    this.logger.log(`Deleted vocabularies for kit: ${kitId}`);
  }

  /**
   * Lưu hàng loạt từ vựng vào DB và gán lesson_kit_id
   */
  async saveBulk(kitId: string, items: any[]): Promise<VocabularyDocument[]> {
    const kitObjectId = new Types.ObjectId(kitId);
    const docs = items.map((item, index) => ({
      ...item,
      lesson_kit_id: kitObjectId,
      sort_order: item.sort_order ?? index + 1,
    }));

    const inserted = await this.vocabularyModel.insertMany(docs);
    this.logger.log(`Saved ${inserted.length} vocabularies for kit: ${kitId}`);
    return inserted as unknown as VocabularyDocument[];
  }
}
