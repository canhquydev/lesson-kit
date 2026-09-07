import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { LessonKitsService } from './lesson-kits.service';
import { LessonKit } from './schemas/lesson-kit.schema';
import { LessonKitStatus, SupportLevel } from '../../common/enums';
import { CreateLessonKitDto } from './dto';

describe('LessonKitsService', () => {
  let service: LessonKitsService;
  let mockLessonKitModel: any;
  let mockEventEmitter: any;
  let mockConfigService: any;
  let mockDbCollection: any;

  beforeEach(async () => {
    mockDbCollection = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };

    mockLessonKitModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      db: {
        collection: jest.fn().mockReturnValue(mockDbCollection),
      },
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('gpt-4o'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonKitsService,
        {
          provide: getModelToken(LessonKit.name),
          useValue: mockLessonKitModel,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LessonKitsService>(LessonKitsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create lesson kit and emit lesson-kit.generate event', async () => {
      const validObjectId = new Types.ObjectId();
      const mockCreatedKit = {
        _id: validObjectId,
        lesson_content_id: validObjectId,
        status: LessonKitStatus.GENERATING,
        current_step: 'phase1',
      };

      mockLessonKitModel.create.mockResolvedValue(mockCreatedKit);

      const dto: CreateLessonKitDto = {
        subject: 'VAT_LI',
        grade: '10',
        lesson_topic: 'Định luật Newton',
        lesson_content_id: validObjectId.toHexString(),
        duration: 45,
        support_level: SupportLevel.B1,
      };

      const result = await service.create(dto);

      expect(mockLessonKitModel.create).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'lesson-kit.generate',
        { lessonKitId: validObjectId.toHexString() },
      );
      expect(result).toEqual(mockCreatedKit);
    });
  });

  describe('findAll', () => {
    it('should return list of lesson kits sorted by createdAt desc', async () => {
      const mockKits = [{ _id: '1' }, { _id: '2' }];
      const execMock = jest.fn().mockResolvedValue(mockKits);
      mockLessonKitModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: execMock }),
      });

      const result = await service.findAll();
      expect(result).toEqual(mockKits);
    });
  });

  describe('findById', () => {
    it('should return kit when found', async () => {
      const mockKit = { _id: 'kit_123', status: LessonKitStatus.COMPLETED };
      mockLessonKitModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockKit),
      });

      const result = await service.findById('kit_123');
      expect(result).toEqual(mockKit);
    });

    it('should throw NotFoundException if not found', async () => {
      mockLessonKitModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('non_existing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and generation time', async () => {
      mockLessonKitModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      await service.updateStatus('kit_123', LessonKitStatus.COMPLETED, 15000);

      expect(mockLessonKitModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'kit_123',
        {
          status: LessonKitStatus.COMPLETED,
          generation_time_ms: 15000,
        },
      );
    });
  });

  describe('updateCurrentStep', () => {
    it('should update current step', async () => {
      mockLessonKitModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      await service.updateCurrentStep('kit_123', 'phase2');

      expect(mockLessonKitModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'kit_123',
        { current_step: 'phase2' },
      );
    });
  });

  describe('getStatus', () => {
    it('should return status summary', async () => {
      const mockKit = {
        _id: 'kit_123',
        status: LessonKitStatus.GENERATING,
        current_step: 'phase1',
        generation_time_ms: 5000,
      };
      mockLessonKitModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockKit),
      });

      const status = await service.getStatus('kit_123');

      expect(status).toEqual({
        status: LessonKitStatus.GENERATING,
        current_step: 'phase1',
        generation_time_ms: 5000,
      });
    });
  });

  describe('delete', () => {
    it('should cascade delete 6 components and the lesson kit', async () => {
      const validObjectId = new Types.ObjectId();
      const mockKit = { _id: validObjectId };

      mockLessonKitModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockKit),
      });
      mockLessonKitModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockKit),
      });

      await service.delete(validObjectId.toHexString());

      expect(mockLessonKitModel.db.collection).toHaveBeenCalledTimes(6);
      expect(mockDbCollection.deleteMany).toHaveBeenCalledTimes(6);
      expect(mockLessonKitModel.findByIdAndDelete).toHaveBeenCalledWith(
        validObjectId.toHexString(),
      );
    });
  });
});
