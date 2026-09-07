import { Test, TestingModule } from '@nestjs/testing';
import { LessonContentsController } from './lesson-contents.controller';
import { LessonContentsService } from './lesson-contents.service';

describe('LessonContentsController', () => {
  let controller: LessonContentsController;
  let service: LessonContentsService;

  const mockLessonContentsService = {
    findBySubjectAndGrade: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonContentsController],
      providers: [
        {
          provide: LessonContentsService,
          useValue: mockLessonContentsService,
        },
      ],
    }).compile();

    controller = module.get<LessonContentsController>(LessonContentsController);
    service = module.get<LessonContentsService>(LessonContentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return lessons from service wrapped in BaseResponseDto', async () => {
      const mockData = [{ _id: '1', title: 'Lesson 1' }];
      mockLessonContentsService.findBySubjectAndGrade.mockResolvedValue(mockData);

      const response = await controller.findAll('VAT_LI', '10');

      expect(service.findBySubjectAndGrade).toHaveBeenCalledWith('VAT_LI', '10');
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockData);
      expect(response.message).toBe('Danh sách bài học');
    });
  });
});
