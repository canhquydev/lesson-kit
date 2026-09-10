import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { VocabulariesService } from './vocabularies.service';
import { Vocabulary } from './schemas/vocabulary.schema';
import { AiService } from '../ai/ai.service';
import { GenerationContext } from '../../common/interfaces';

describe('VocabulariesService', () => {
  let service: VocabulariesService;
  let mockModel: any;
  let mockAiService: any;

  const mockContext: GenerationContext = {
    lessonContentId: new Types.ObjectId().toHexString(),
    subject: 'VAT_LI',
    grade: '10',
    title: 'Chuyển động thẳng đều',
    content: 'Nội dung bài học về vận tốc, quãng đường, thời gian trong chuyển động thẳng đều.',
    duration: 45,
    supportLevel: 'B1',
  };

  const sampleValidVocabularies = Array.from({ length: 10 }).map((_, i) => ({
    word: `word_${i + 1}`,
    phonetic: `/wɜːd_${i + 1}/`,
    meaning_vi: `nghĩa_${i + 1}`,
    part_of_speech: 'noun',
    example_sentence: `This is example sentence number ${i + 1}.`,
    context_note: `Ghi chú ${i + 1}`,
  }));

  beforeEach(async () => {
    mockModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(sampleValidVocabularies),
        }),
      }),
      deleteMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 10 }),
      }),
      insertMany: jest.fn().mockResolvedValue(sampleValidVocabularies),
    };

    mockAiService = {
      generateJson: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocabulariesService,
        {
          provide: getModelToken(Vocabulary.name),
          useValue: mockModel,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    service = module.get<VocabulariesService>(VocabulariesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate()', () => {
    it('should validate successfully for 10 valid vocabulary items', () => {
      const result = service.validate(sampleValidVocabularies);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation if count is less than 8', () => {
      const result = service.validate(sampleValidVocabularies.slice(0, 5));
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Vocabulary count must be between 8 and 15 words');
    });

    it('should fail validation if required fields are missing or empty', () => {
      const invalidList = [
        ...sampleValidVocabularies.slice(0, 8),
        { word: '', phonetic: '', meaning_vi: '', part_of_speech: '', example_sentence: '' },
      ];
      const result = service.validate(invalidList);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing or empty "word"'))).toBe(true);
    });

    it('should fail validation if input is not an array', () => {
      const result = service.validate(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Output must be an array');
    });
  });

  describe('getPrompt()', () => {
    it('should generate detailed prompt containing lesson context', () => {
      const prompt = service.getPrompt(mockContext);
      expect(prompt).toContain(mockContext.subject);
      expect(prompt).toContain(mockContext.title);
      expect(prompt).toContain('8 đến 15 từ vựng');
    });

    it('should append retry errors if provided', () => {
      const prompt = service.getPrompt(mockContext, ['Item 1 is missing phonetic']);
      expect(prompt).toContain('Lần sinh trước bị lỗi validation');
      expect(prompt).toContain('Item 1 is missing phonetic');
    });
  });

  describe('generate()', () => {
    it('should call aiService and return validated vocabularies with sort_order', async () => {
      mockAiService.generateJson.mockResolvedValueOnce({
        vocabularies: sampleValidVocabularies,
      });

      const result = await service.generate(mockContext);

      expect(result).toHaveLength(10);
      expect(result[0].sort_order).toBe(1);
      expect(mockAiService.generateJson).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByKitId, deleteByKitId, saveBulk', () => {
    const kitId = new Types.ObjectId().toHexString();

    it('should find items by kitId sorted by sort_order', async () => {
      const result = await service.findByKitId(kitId);
      expect(result).toEqual(sampleValidVocabularies);
      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should delete items by kitId', async () => {
      await service.deleteByKitId(kitId);
      expect(mockModel.deleteMany).toHaveBeenCalled();
    });

    it('should save bulk items with lesson_kit_id assigned', async () => {
      const result = await service.saveBulk(kitId, sampleValidVocabularies);
      expect(result).toEqual(sampleValidVocabularies);
      expect(mockModel.insertMany).toHaveBeenCalled();
    });
  });
});
