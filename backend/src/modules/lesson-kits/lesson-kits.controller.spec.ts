import { Test, TestingModule } from '@nestjs/testing';
import { LessonKitsController } from './lesson-kits.controller';
import { LessonKitsService } from './lesson-kits.service';
import { LessonKitStatus, SupportLevel, ComponentType } from '../../common/enums';
import { CreateLessonKitDto } from './dto';
import { RegenerateService } from '../generation/regenerate.service';

describe('LessonKitsController', () => {
  let controller: LessonKitsController;
  let service: LessonKitsService;

  const mockLessonKitsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    getStatus: jest.fn(),
    delete: jest.fn(),
  };

  const mockRegenerateService = {
    regenerate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonKitsController],
      providers: [
        {
          provide: LessonKitsService,
          useValue: mockLessonKitsService,
        },
        {
          provide: RegenerateService,
          useValue: mockRegenerateService,
        },
      ],
    }).compile();

    controller = module.get<LessonKitsController>(LessonKitsController);
    service = module.get<LessonKitsService>(LessonKitsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generate', () => {
    it('should create kit and return accepted status', async () => {
      const dto: CreateLessonKitDto = {
        subject: 'VAT_LI',
        grade: '10',
        lesson_topic: 'Định luật Newton',
        lesson_content_id: '507f1f77bcf86cd799439011',
        duration: 45,
        support_level: SupportLevel.B1,
      };

      mockLessonKitsService.create.mockResolvedValue({
        _id: 'kit_123',
        status: LessonKitStatus.GENERATING,
      });

      const response = await controller.generate(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(response.success).toBe(true);
      expect(response.data.lesson_kit_id).toBe('kit_123');
      expect(response.data.status).toBe(LessonKitStatus.GENERATING);
    });
  });

  describe('findAll', () => {
    it('should return paginated list', async () => {
      const mockList = [{ _id: 'kit_1' }, { _id: 'kit_2' }];
      mockLessonKitsService.findAll.mockResolvedValue(mockList);

      const response = await controller.findAll('1', '10');

      expect(service.findAll).toHaveBeenCalledWith(1, 10);
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockList);
    });
  });

  describe('findOne', () => {
    it('should return kit detail', async () => {
      const mockKit = { _id: 'kit_123', subject: 'VAT_LI' };
      mockLessonKitsService.findById.mockResolvedValue(mockKit);

      const response = await controller.findOne('kit_123');

      expect(service.findById).toHaveBeenCalledWith('kit_123');
      expect(response.success).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return status with progress', async () => {
      const mockStatus = {
        status: LessonKitStatus.GENERATING,
        current_step: 'phase1',
        progress_percent: 5,
        generation_time_ms: 5000,
      };
      mockLessonKitsService.getStatus.mockResolvedValue(mockStatus);

      const response = await controller.getStatus('kit_123');

      expect(service.getStatus).toHaveBeenCalledWith('kit_123');
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockStatus);
    });
  });

  describe('delete', () => {
    it('should call delete on service', async () => {
      mockLessonKitsService.delete.mockResolvedValue(undefined);

      const response = await controller.delete('kit_123');

      expect(service.delete).toHaveBeenCalledWith('kit_123');
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: 'kit_123' });
    });
  });

  describe('regenerate', () => {
    it('should call regenerateService and return result', async () => {
      const mockResult = {
        lesson_kit_id: 'kit_123',
        component: ComponentType.VOCABULARY,
        status: 'regenerated',
        regenerated: true,
        stale_components: [ComponentType.SCRIPT, ComponentType.QUESTIONS, ComponentType.ASSESSMENT],
        data: [{ word: 'test' }],
      };
      mockRegenerateService.regenerate.mockResolvedValue(mockResult);

      const response = await controller.regenerate('kit_123', 'vocabulary');

      expect(mockRegenerateService.regenerate).toHaveBeenCalledWith('kit_123', 'vocabulary');
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockResult);
    });
  });
});
