import { Test, TestingModule } from '@nestjs/testing';
import { LessonConfigController } from './config.controller';
import { LessonConfigService } from './config.service';

describe('LessonConfigController', () => {
  let controller: LessonConfigController;
  let service: LessonConfigService;

  const mockConfigService = {
    getSubjects: jest.fn(),
    getOptions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonConfigController],
      providers: [
        {
          provide: LessonConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<LessonConfigController>(LessonConfigController);
    service = module.get<LessonConfigService>(LessonConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSubjects', () => {
    it('should return subjects wrapped in BaseResponseDto', async () => {
      const mockSubjects = [{ code: 'VAT_LI', name: 'Vật lí' }];
      mockConfigService.getSubjects.mockResolvedValue(mockSubjects);

      const res = await controller.getSubjects();

      expect(service.getSubjects).toHaveBeenCalled();
      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockSubjects);
      expect(res.message).toBe('Danh sách môn học');
    });
  });

  describe('getOptions', () => {
    it('should return options wrapped in BaseResponseDto', () => {
      const mockOptions = { durations: [45], support_levels: [] };
      mockConfigService.getOptions.mockReturnValue(mockOptions);

      const res = controller.getOptions();

      expect(service.getOptions).toHaveBeenCalled();
      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockOptions);
      expect(res.message).toBe('Cấu hình options');
    });
  });
});
