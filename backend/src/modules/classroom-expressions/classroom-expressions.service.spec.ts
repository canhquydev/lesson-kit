import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ClassroomExpressionsService } from './classroom-expressions.service';
import { ClassroomExpression } from './schemas/classroom-expression.schema';
import { AiService } from '../ai/ai.service';
import { GenerationContext } from '../../common/interfaces';

describe('ClassroomExpressionsService', () => {
  let service: ClassroomExpressionsService;
  let mockModel: any;
  let mockAiService: any;

  const mockContext: GenerationContext = {
    lessonContentId: new Types.ObjectId().toHexString(),
    subject: 'VAT_LI',
    grade: '10',
    title: 'Chuyển động thẳng đều',
    content: 'Bài học vật lí 10...',
    duration: 45,
    supportLevel: 'B1',
  };

  const sampleValidExpressions = [
    // opening: 3 items
    {
      category: 'opening',
      expression_en: 'Good morning everyone!',
      translation_vi: 'Chào buổi sáng cả lớp!',
      situation_note: 'Bắt đầu bài học',
    },
    {
      category: 'opening',
      expression_en: 'Let us begin today with an interesting question.',
      translation_vi: 'Hãy bắt đầu hôm nay với một câu hỏi thú vị.',
      situation_note: 'Khởi động',
    },
    {
      category: 'opening',
      expression_en: 'Please open your textbooks to page 20.',
      translation_vi: 'Xin mời các em mở sách giáo khoa trang 20.',
      situation_note: 'Chuẩn bị sách vở',
    },
    // questioning: 3 items
    {
      category: 'questioning',
      expression_en: 'Who can tell me what uniform motion means?',
      translation_vi: 'Ai có thể cho cô biết chuyển động thẳng đều nghĩa là gì?',
      situation_note: 'Đặt câu hỏi gợi mở',
    },
    {
      category: 'questioning',
      expression_en: 'What happens to the speed in this case?',
      translation_vi: 'Tốc độ sẽ ra sao trong trường hợp này?',
      situation_note: 'Hỏi chi tiết',
    },
    {
      category: 'questioning',
      expression_en: 'Can you give a real-life example?',
      translation_vi: 'Em có thể cho một ví dụ trong thực tế không?',
      situation_note: 'Liên hệ thực tế',
    },
  ];

  beforeEach(async () => {
    mockModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(sampleValidExpressions),
        }),
      }),
      deleteMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 6 }),
      }),
      insertMany: jest.fn().mockResolvedValue(sampleValidExpressions),
    };

    mockAiService = {
      generateJson: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassroomExpressionsService,
        {
          provide: getModelToken(ClassroomExpression.name),
          useValue: mockModel,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    service = module.get<ClassroomExpressionsService>(
      ClassroomExpressionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate()', () => {
    it('should validate successfully for valid expressions with 3 items per category', () => {
      const result = service.validate(sampleValidExpressions);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation if category count is less than 3', () => {
      const invalidData = [
        sampleValidExpressions[0], // only 1 item in opening
        ...sampleValidExpressions.slice(3), // 3 items in questioning
      ];
      const result = service.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes('must contain between 3 and 5 expressions'),
        ),
      ).toBe(true);
    });

    it('should fail validation for unknown category', () => {
      const invalidData = [
        ...sampleValidExpressions,
        {
          category: 'unknown_category',
          expression_en: 'Hi',
          translation_vi: 'Chào',
          situation_note: 'Note',
        },
      ];
      const result = service.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('Invalid or missing category')),
      ).toBe(true);
    });

    it('should fail validation when empty or non-array', () => {
      expect(service.validate([]).isValid).toBe(false);
      expect(service.validate(null as any).isValid).toBe(false);
    });
  });

  describe('getPrompt()', () => {
    it('should generate prompt with 8 categories and context info', () => {
      const prompt = service.getPrompt(mockContext);
      expect(prompt).toContain(mockContext.title);
      expect(prompt).toContain('8 NHÓM TÌNH HUỐNG QUY CHUẨN');
      expect(prompt).toContain('opening');
      expect(prompt).toContain('closing');
    });
  });

  describe('generate()', () => {
    it('should call aiService and return sorted expressions', async () => {
      mockAiService.generateJson.mockResolvedValueOnce({
        expressions: sampleValidExpressions,
      });

      const result = await service.generate(mockContext);
      expect(result).toHaveLength(6);
      expect(result[0].sort_order).toBe(1);
    });
  });

  describe('findByKitId, deleteByKitId, saveBulk', () => {
    const kitId = new Types.ObjectId().toHexString();

    it('should find items by kitId', async () => {
      const result = await service.findByKitId(kitId);
      expect(result).toEqual(sampleValidExpressions);
      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should delete items by kitId', async () => {
      await service.deleteByKitId(kitId);
      expect(mockModel.deleteMany).toHaveBeenCalled();
    });

    it('should save bulk items with lesson_kit_id', async () => {
      const result = await service.saveBulk(kitId, sampleValidExpressions);
      expect(result).toEqual(sampleValidExpressions);
      expect(mockModel.insertMany).toHaveBeenCalled();
    });
  });
});
