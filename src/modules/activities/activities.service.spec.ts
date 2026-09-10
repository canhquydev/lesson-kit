import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ActivitiesService } from './activities.service';
import { Activity } from './schemas/activity.schema';
import { AiService } from '../ai/ai.service';
import { GenerationContext } from '../../common/interfaces';

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let mockModel: any;
  let mockAiService: any;

  const mockContext: GenerationContext = {
    lessonContentId: new Types.ObjectId().toHexString(),
    subject: 'VAT_LI',
    grade: '10',
    title: 'Chuyển động thẳng đều',
    content: 'Nội dung bài học vật lí 10...',
    duration: 45,
    supportLevel: 'B1',
  };

  const sampleValidActivities = [
    {
      activity_name: 'Velocity vs Speed',
      activity_type: 'Think-Pair-Share',
      description: 'Học sinh phân biệt vận tốc và tốc độ qua ví dụ thực tế.',
      objective: 'Hiểu bản chất vectơ của vận tốc so với tốc độ.',
      duration_minutes: 8,
      group_type: 'pair',
      instructions: '1. Đặt câu hỏi... 2. Suy nghĩ 1p... 3. Thảo luận cặp...',
      english_instructions: 'Think about this question for one minute, then discuss with your partner...',
      student_task: 'So sánh velocity và speed, tìm ví dụ thực tế.',
      expected_outcome: 'Nêu được: velocity có hướng, speed không có hướng.',
    },
    {
      activity_name: 'Motion Matching Quiz',
      activity_type: 'Matching',
      description: 'Nối thuật ngữ vật lí với định nghĩa tương ứng.',
      objective: 'Ghi nhớ thuật ngữ chuyển động thẳng đều.',
      duration_minutes: 10,
      group_type: 'group',
      instructions: '1. Chia nhóm 4 người... 2. Phát phiếu bài tập...',
      english_instructions: 'Match each physics term with its correct definition.',
      student_task: 'Hoàn thành bảng nối định nghĩa trong 5 phút.',
      expected_outcome: 'Hoàn thành chính xác 100% các cặp thuật ngữ.',
    },
  ];

  beforeEach(async () => {
    mockModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(sampleValidActivities),
        }),
      }),
      deleteMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      }),
      insertMany: jest.fn().mockResolvedValue(sampleValidActivities),
    };

    mockAiService = {
      generateJson: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: getModelToken(Activity.name),
          useValue: mockModel,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate()', () => {
    it('should validate successfully for 2 valid activities', () => {
      const result = service.validate(sampleValidActivities);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation if activity count is less than 2', () => {
      const result = service.validate([sampleValidActivities[0]]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Activity count must be between 2 and 3');
    });

    it('should fail validation if activity count is more than 3', () => {
      const fourActivities = [
        ...sampleValidActivities,
        sampleValidActivities[0],
        sampleValidActivities[1],
      ];
      const result = service.validate(fourActivities);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Activity count must be between 2 and 3');
    });

    it('should fail validation for unknown activity_type', () => {
      const invalidActivities = [
        sampleValidActivities[0],
        { ...sampleValidActivities[1], activity_type: 'InvalidType' },
      ];
      const result = service.validate(invalidActivities);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid or missing activity_type'))).toBe(true);
    });

    it('should fail validation for unknown group_type', () => {
      const invalidActivities = [
        sampleValidActivities[0],
        { ...sampleValidActivities[1], group_type: 'unknown_group' },
      ];
      const result = service.validate(invalidActivities);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid or missing group_type'))).toBe(true);
    });

    it('should fail validation if duration_minutes <= 0', () => {
      const invalidActivities = [
        sampleValidActivities[0],
        { ...sampleValidActivities[1], duration_minutes: 0 },
      ];
      const result = service.validate(invalidActivities);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('positive number'))).toBe(true);
    });
  });

  describe('getPrompt()', () => {
    it('should generate prompt with 10 activity types and context info', () => {
      const prompt = service.getPrompt(mockContext);
      expect(prompt).toContain(mockContext.title);
      expect(prompt).toContain('10 LOẠI HÌNH HOẠT ĐỘNG ĐỀ XUẤT');
      expect(prompt).toContain('Think-Pair-Share');
      expect(prompt).toContain('Practice task');
    });
  });

  describe('generate()', () => {
    it('should call aiService and return sorted activities', async () => {
      mockAiService.generateJson.mockResolvedValueOnce({
        activities: sampleValidActivities,
      });

      const result = await service.generate(mockContext);
      expect(result).toHaveLength(2);
      expect(result[0].sort_order).toBe(1);
    });
  });

  describe('findByKitId, deleteByKitId, saveBulk', () => {
    const kitId = new Types.ObjectId().toHexString();

    it('should find items by kitId', async () => {
      const result = await service.findByKitId(kitId);
      expect(result).toEqual(sampleValidActivities);
      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should delete items by kitId', async () => {
      await service.deleteByKitId(kitId);
      expect(mockModel.deleteMany).toHaveBeenCalled();
    });

    it('should save bulk items with lesson_kit_id', async () => {
      const result = await service.saveBulk(kitId, sampleValidActivities);
      expect(result).toEqual(sampleValidActivities);
      expect(mockModel.insertMany).toHaveBeenCalled();
    });
  });
});
