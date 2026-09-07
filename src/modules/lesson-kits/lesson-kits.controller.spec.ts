import { Test, TestingModule } from '@nestjs/testing';
import { LessonKitsController } from './lesson-kits.controller';
import { LessonKitsService } from './lesson-kits.service';
import { LessonKitStatus, SupportLevel } from '../../common/enums';
import { CreateLessonKitDto } from './dto';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonKitsController],
      providers: [
        {
          provide: LessonKitsService,
          useValue: mockLessonKitsService,
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
      expect(response.data).toEqual({
        lesson_kit_id: 'kit_123',
        status: LessonKitStatus.GENERATING,
      });
    });
  });

  describe('findAll', () => {
    it('should return all kits', async () => {
      const mockKits = [{ _id: '1' }];
      mockLessonKitsService.findAll.mockResolvedValue(mockKits);

      const response = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockKits);
    });
  });

  describe('findOne', () => {
    it('should return kit by id', async () => {
      const mockKit = { _id: 'kit_123' };
      mockLessonKitsService.findById.mockResolvedValue(mockKit);

      const response = await controller.findOne('kit_123');

      expect(service.findById).toHaveBeenCalledWith('kit_123');
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockKit);
    });
  });

  describe('getStatus', () => {
    it('should return status of kit', async () => {
      const mockStatus = {
        status: LessonKitStatus.GENERATING,
        current_step: 'phase1',
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
    it('should return regenerated placeholder response', async () => {
      const response = await controller.regenerate('kit_123', 'vocabulary');

      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        lesson_kit_id: 'kit_123',
        component: 'vocabulary',
        status: 'regenerated',
      });
    });
  });
});
