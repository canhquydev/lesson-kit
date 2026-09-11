import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { LessonContentsService } from './lesson-contents.service';
import { LessonContent } from './schemas/lesson-content.schema';

describe('LessonContentsService', () => {
  let service: LessonContentsService;
  let mockLessonContentModel: any;

  beforeEach(async () => {
    mockLessonContentModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonContentsService,
        {
          provide: getModelToken(LessonContent.name),
          useValue: mockLessonContentModel,
        },
      ],
    }).compile();

    service = module.get<LessonContentsService>(LessonContentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBySubjectAndGrade', () => {
    it('should query and return lessons matching subject and grade', async () => {
      const mockLessons = [
        { _id: '1', title: 'Bài 1', lesson: '1', grade: '10' },
      ];
      const execMock = jest.fn().mockResolvedValue(mockLessons);
      const sortMock = jest.fn().mockReturnValue({ exec: execMock });
      const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
      mockLessonContentModel.find.mockReturnValue({ select: selectMock });

      const result = await service.findBySubjectAndGrade('VAT_LI', '10');

      expect(mockLessonContentModel.find).toHaveBeenCalledWith({
        subject: 'VAT_LI',
        grade: '10',
      });
      expect(selectMock).toHaveBeenCalledWith('_id title lesson grade');
      expect(sortMock).toHaveBeenCalledWith({ lesson: 1 });
      expect(result).toEqual(mockLessons);
    });
  });

  describe('findById', () => {
    it('should return lesson if found', async () => {
      const mockLesson = { _id: '123', title: 'Định luật Newton' };
      mockLessonContentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockLesson),
      });

      const result = await service.findById('123');
      expect(result).toEqual(mockLesson);
    });

    it('should throw NotFoundException if not found', async () => {
      mockLessonContentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('non_existing_id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
