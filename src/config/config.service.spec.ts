import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LessonConfigService } from './config.service';
import { LessonContent } from '../modules/lesson-contents/schemas/lesson-content.schema';
import { SupportLevel } from '../common/enums';

describe('LessonConfigService', () => {
  let service: LessonConfigService;
  let mockLessonContentModel: any;

  beforeEach(async () => {
    mockLessonContentModel = {
      distinct: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonConfigService,
        {
          provide: getModelToken(LessonContent.name),
          useValue: mockLessonContentModel,
        },
      ],
    }).compile();

    service = module.get<LessonConfigService>(LessonConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSubjects', () => {
    it('should return distinct subjects with mapped names', async () => {
      mockLessonContentModel.distinct.mockReturnValue({
        exec: jest.fn().mockResolvedValue(['VAT_LI', 'UNKNOWN_SUBJECT']),
      });

      const result = await service.getSubjects();

      expect(mockLessonContentModel.distinct).toHaveBeenCalledWith('subject');
      expect(result).toEqual([
        { code: 'VAT_LI', name: 'Vật lí' },
        { code: 'UNKNOWN_SUBJECT', name: 'UNKNOWN_SUBJECT' },
      ]);
    });
  });

  describe('getOptions', () => {
    it('should return valid durations and CEFR support levels', () => {
      const result = service.getOptions();

      expect(result.durations).toEqual([35, 40, 45]);
      expect(result.support_levels).toHaveLength(3);

      const codes = result.support_levels.map((s) => s.code);
      expect(codes).toContain(SupportLevel.B1);
      expect(codes).toContain(SupportLevel.B2);
      expect(codes).toContain(SupportLevel.C1);
    });
  });
});
